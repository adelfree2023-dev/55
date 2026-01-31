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
        try {
            // 1. Check for explicit bypass via query (Internal Health Checks)
            if (req.query?.skip_tenant_validation === '1') {
                this.logger.debug('Skipping tenant validation via query param');
                return next();
            }

            // Extract tenant from HOST header with strict validation
            const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '') as string;

            // STRICT WHITELIST VALIDATION (prevents injection attacks)
            const apexPatterns = [
                /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.apex\.localhost$/,
                /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.apex-v2\.duckdns\.org$/,
                /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)\.localhost$/
            ];

            let subdomain: string | null = null;
            for (const pattern of apexPatterns) {
                const match = host.match(pattern);
                if (match) {
                    subdomain = match[1];
                    break;
                }
            }

            if (!subdomain) {
                // Allow system routes ONLY on safe hosts
                const safeHosts = [
                    'localhost:3000', 'localhost:3001', 'localhost:4000',
                    '127.0.0.1:3000', '127.0.0.1:3001', '127.0.0.1:4000',
                    'apex-v2.duckdns.org'
                ];
                // Also check if valid IP
                const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);

                if (!safeHosts.some(h => host === h || host.startsWith(h + ':')) && !isIp) {
                    // If it's not in safe list and not a direct IP (often used for health checks inside network), block
                    // However, internal docker networking might use IP. 
                    // Let's trust the whitelist approach from the audit which was specific.
                    // The audit code was: if (!safeHosts.some(h => host.startsWith(h))) 

                    // Implementing audit logic strictly:
                    const isSafe = safeHosts.some(h => host.startsWith(h));
                    if (!isSafe) {
                        this.logger.warn(`🚨 BLOCKED SUSPICIOUS HOST: ${host}`);
                        throw new ForbiddenException('Invalid tenant context');
                    }
                }

                this.logger.log(`System route access: ${host}${req.url}`);
                return next();
            }

            // DATABASE WHITELIST CHECK (prevents access to non-existent tenants)
            const tenantInfo = await this.getTenantInfo(subdomain);
            if (!tenantInfo) {
                this.logger.warn(`🚨 BLOCKED INVALID TENANT ACCESS: ${subdomain} from ${req.ip}`);
                throw new ForbiddenException('Invalid tenant context');
            }

            // 🔒 CRITICAL FIX: SET search_path ON REQUEST-SCOPED CONNECTION ONLY
            // NEVER on global pool - this was causing cross-tenant leakage
            const client = await this.pool.connect();
            req.dbClient = client; // Attach to request lifecycle for Service usage

            await client.query(`SET search_path TO "tenant_${tenantInfo.id}", public`);

            req.tenantId = tenantInfo.id;
            req.tenantTier = tenantInfo.plan_id || 'basic';
            req.tenantSchema = `tenant_${tenantInfo.id}`;

            this.logger.log(`✅ Resolved tenant: ${subdomain} -> ${tenantInfo.id} (Schema: ${req.tenantSchema})`);

            // CRITICAL: Reset search_path AFTER request completes
            res.on('finish', () => {
                client.query('SET search_path TO public')
                    .catch(err => this.logger.error(`Reset failed: ${err.message}`))
                    .finally(() => client.release());
            });

            next();
        } catch (error: any) {
            if (error instanceof ForbiddenException) throw error;
            this.logger.error(`Tenant resolution error: ${error.message}`);
            throw new ForbiddenException('Invalid tenant context');
        }
    }

    private async getTenantInfo(subdomain: string): Promise<{ id: string, plan_id: string } | null> {
        // Cache validation for 5 minutes
        const cached = this.whitelistCache.get(subdomain);
        if (cached) return cached as any;

        try {
            const result = await this.pool.query(
                `SELECT id, plan_id FROM public.tenants WHERE subdomain = $1 AND status = 'active'`,
                [subdomain]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const tenantInfo = result.rows[0];
            this.whitelistCache.set(subdomain, tenantInfo);

            setTimeout(() => this.whitelistCache.delete(subdomain), 300000);
            return tenantInfo;
        } catch (error: any) {
            this.logger.error(`Whitelist check failed: ${error.message}`);
            return null;
        }
    }
}
