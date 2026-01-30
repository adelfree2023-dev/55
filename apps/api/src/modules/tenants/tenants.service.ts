import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { TenantQuery } from './schemas/tenant-query.schema';

@Injectable()
export class TenantsService {
    private readonly logger = new Logger(TenantsService.name);
    private readonly pool: Pool;

    constructor() {
        this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }

    async findAll(query: TenantQuery) {
        const { status, plan, search, page, limit } = query;
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (plan) {
            conditions.push(`plan = $${paramIndex++}`);
            values.push(plan);
        }

        if (search) {
            conditions.push(`(subdomain ILIKE $${paramIndex} OR store_name ILIKE $${paramIndex})`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await this.pool.query(
            `SELECT COUNT(*) as total FROM public.tenants ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].total, 10);

        // Get paginated results
        values.push(limit, offset);
        const result = await this.pool.query(
            `SELECT id, subdomain, store_name, owner_email, status, plan, created_at, updated_at
       FROM public.tenants
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        return {
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const result = await this.pool.query(
            `SELECT * FROM public.tenants WHERE id = $1 LIMIT 1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new Error(`Tenant "${id}" not found`);
        }

        return result.rows[0];
    }
}
