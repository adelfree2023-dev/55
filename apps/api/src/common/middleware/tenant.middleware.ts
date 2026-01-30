import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { setSchemaPath } from '@apex/db';
import * as pg from 'pg';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TenantMiddleware.name);
    private readonly pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
        // Extract subdomain from X-Tenant-Id header or Host header
        let subdomain = req.headers['x-tenant-id'] as string;

        if (!subdomain) {
            const host = (req.headers['x-forwarded-host'] || req.headers['host']) as string;
            if (host) {
                // Handle patterns like: subdomain.apex-v2.duckdns.org or subdomain.localhost
                const parts = host.split('.');
                if (parts.length >= 3) {
                    // If it's subdomain.apex-v2.duckdns.org, parts are [subdomain, apex-v2, duckdns, org]
                    // If it's subdomain.localhost, parts are [subdomain, localhost]
                    subdomain = parts[0];
                }
            }
        }

        // Ignore certain subdomains like 'api', 'www', or if still empty
        if (!subdomain || ['api', 'www', 'localhost', 'apex-v2'].includes(subdomain.toLowerCase())) {
            // For provisioning routes, we already exclude them in AppModule
            // For others, if we need a tenant and don't have one, we MUST fail per test requirement
            this.logger.debug(`No tenant context for host: ${req.headers['host']}`);
            if (!subdomain) {
                throw new BadRequestException('X-Tenant-Id header is missing or invalid host');
            }
            return next();
        }

        try {
            // Resolve subdomain to tenant ID using direct pool for better error visibility
            const result = await this.pool.query(
                'SELECT id FROM public.tenants WHERE subdomain = $1 LIMIT 1',
                [subdomain]
            );

            if (result.rows.length === 0) {
                this.logger.warn(`Tenant not found for subdomain: ${subdomain}`);
                throw new BadRequestException(`Invalid tenant subdomain: ${subdomain}`);
            }

            const tenantId = result.rows[0].id;

            // Set the database search path for the current request context
            await setSchemaPath(tenantId);
            this.logger.debug(`Resolved tenant ${subdomain} to ID ${tenantId}`);
            next();
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`Tenant resolution failed for ${subdomain}: ${error.message}`, error.stack);
            throw new BadRequestException(`Invalid tenant: ${subdomain}`);
        }
    }
}
