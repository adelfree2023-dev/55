import { Injectable, NestMiddleware, BadRequestException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { setSchemaPath } from '@apex/db';
import { SKIP_TENANT_VALIDATION_KEY } from '../decorators/skip-tenant-validation.decorator';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TenantMiddleware.name);
    private readonly pool: Pool;
    private readonly whitelistCache = new Map<string, boolean>();

    constructor(
        @Inject('BoundPool') boundPool: Pool,
        private readonly reflector: Reflector
    ) {
        this.pool = boundPool;
    }

    async use(req: any, res: any, next: () => void) {
        const url = req.url || req.raw?.url || '';
        const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '') as string;
        let client: any = null;
        let released = false;

        const cleanup = (eventType: string) => {
            if (client && !released) {
                released = true;
                this.logger.debug(`[OPS-L3] Client released via ${eventType}`);
                // Zero-trust reset: Fire and forget search_path reset
                client.query('SET search_path TO public')
                    .catch(() => {/* ignore reset errors */ })
                    .finally(() => client.release());
            }
        };

        try {
            // 1. SYSTEM BYPASS (Internal Health Checks & System Routes)
            const isSystemRoute =
                url === '/health' ||
                url.startsWith('/provisioning') ||
                url.startsWith('/super-admin') ||
                req.query?.skip_tenant_validation === '1';

            if (isSystemRoute) {
                return next();
            }

            let subdomain: string | null = (req.headers['x-tenant-subdomain'] || null) as string | null;

            if (!subdomain) {
                const apexPatterns = [
                    /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.apex\.localhost$/,
                    /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.apex-v2\.duckdns\.org$/,
                    /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.localhost$/
                ];

                for (const pattern of apexPatterns) {
                    const match = host.match(pattern);
                    if (match) {
                        subdomain = match[1];
                        if (subdomain === 'api') subdomain = null;
                        break;
                    }
                }
            }

            if (!subdomain) {
                return next();
            }

            const tenantInfo = await this.getTenantInfo(subdomain);

            if (!tenantInfo) {
                this.logger.warn(`🚨 BLOCKED INVALID TENANT ACCESS: ${subdomain} from ${req.ip}`);
                throw new ForbiddenException('Invalid tenant context');
            }

            // 🔒 PHASE 2 HARDENING: Connection pool acquisition with 5s timeout
            const acquisitionPromise = this.pool.connect();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection acquisition timeout')), 5000)
            );

            client = await Promise.race([acquisitionPromise, timeoutPromise]) as any;
            req.dbClient = client;

            // Use subdomain for schema name to match provisioning logic
            await client.query(`SET search_path TO "tenant_${tenantInfo.subdomain}", public`);

            req.tenantId = tenantInfo.id;
            req.tenantSubdomain = tenantInfo.subdomain;
            req.tenantTier = tenantInfo.plan_id || 'basic';
            req.tenantSchema = `tenant_${tenantInfo.subdomain}`;

            // 🛡️ TRIPLICATE EVENT CLEANUP (OPS-L3 Strategy)
            res.on('finish', () => cleanup('finish')); // Response sent
            res.on('close', () => cleanup('close'));   // Client disconnected early
            res.on('error', () => cleanup('error'));   // Stream error

            next();
        } catch (error: any) {

            if (client) cleanup('error-pre-next');
            if (error instanceof ForbiddenException) throw error;
            this.logger.error(`Tenant resolution error [Host: ${host}]: ${error.message}`);
            throw new ForbiddenException('Invalid tenant context');
        }
    }

    private async getTenantInfo(subdomain: string): Promise<{ id: string, subdomain: string, plan_id: string, status: string } | null> {
        // Cache validation for 5 minutes
        const cached = this.whitelistCache.get(subdomain);
        if (cached) {
            const cachedInfo = cached as any;
            // 🛡️ Always check status even for cached items
            if (cachedInfo.status !== 'active') {
                this.logger.warn(`🚨 BLOCKED CACHED INACTIVE TENANT ACCESS: ${subdomain} (Status: ${cachedInfo.status})`);
                throw new ForbiddenException(`Tenant store is ${cachedInfo.status}. Access to this site is temporarily restricted.`);
            }
            return cachedInfo;
        }

        try {
            // Include status in selection
            const result = await this.pool.query(
                `SELECT id, subdomain, plan_id, status FROM public.tenants WHERE subdomain = $1 AND deleted_at IS NULL`,
                [subdomain]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const tenantInfo = result.rows[0];

            // 🛡️ Phase 8: Immediate access block for non-active tenants
            if (tenantInfo.status !== 'active') {
                this.logger.warn(`🚨 BLOCKED INACTIVE TENANT ACCESS: ${subdomain} (Status: ${tenantInfo.status})`);
                throw new ForbiddenException(`Tenant store is ${tenantInfo.status}. Access to this site is temporarily restricted.`);
            }

            this.whitelistCache.set(subdomain, tenantInfo);

            setTimeout(() => this.whitelistCache.delete(subdomain), 300000);
            return tenantInfo;
        } catch (error: any) {

            if (error instanceof ForbiddenException) throw error;
            this.logger.error(`Whitelist check failed: ${error.message}`);
            return null;
        }
    }
}
