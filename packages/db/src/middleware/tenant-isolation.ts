import { NextFunction, Request, Response } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export class TenantIsolationMiddleware {
    public static pool = new Pool({ connectionString: process.env.DATABASE_URL });

    static async setTenantSchema(req: any, res: Response, next: NextFunction) {
        const subdomain = req.hostname.split('.')[0];

        // Check if Tenant exists in public table
        const tenantCheck = await this.pool.query(
            `SELECT id FROM public.tenants WHERE subdomain = $1 AND status = 'active'`,
            [subdomain]
        );

        if (tenantCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Set search_path for Tenant schema
        const tenantId = tenantCheck.rows[0].id;
        req.tenantId = tenantId;
        req.tenantSchema = `tenant_${subdomain}`;

        // Verify schema exists
        const schemaExists = await this.pool.query(
            `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
            [req.tenantSchema]
        );

        if (schemaExists.rows.length === 0) {
            return res.status(503).json({ error: 'Tenant schema not provisioned' });
        }

        // Set the search_path for the current connection
        await this.pool.query(`SET search_path TO "${req.tenantSchema}", public`);

        next();
    }
}
