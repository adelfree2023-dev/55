import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { z } from 'zod';

export const TenantQuerySchema = z.object({
    status: z.enum(['active', 'suspended', 'pending']).optional(),
    plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export class TenantQuery {
    status?: 'active' | 'suspended' | 'pending';
    plan?: 'basic' | 'pro' | 'enterprise';
    search?: string;
    page: number = 1;
    limit: number = 20;
}

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
            conditions.push(`plan_id = $${paramIndex++}`);
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
            `SELECT id, subdomain, name, owner_email, status, plan_id, created_at, updated_at
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
            throw new NotFoundException(`Tenant "${id}" not found`);
        }

        return result.rows[0];
    }

    async suspend(id: string) {
        const result = await this.pool.query(
            `UPDATE public.tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            throw new NotFoundException(`Tenant "${id}" not found`);
        }
        this.logger.warn(`🛑 Tenant suspended: ${id}`);
        return result.rows[0];
    }

    async activate(id: string) {
        const result = await this.pool.query(
            `UPDATE public.tenants SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            throw new NotFoundException(`Tenant "${id}" not found`);
        }
        this.logger.log(`✅ Tenant activated: ${id}`);
        return result.rows[0];
    }

    async impersonate(id: string) {
        const tenant = await this.findOne(id);
        this.logger.log(`🎭 Super Admin impersonating tenant: ${tenant.subdomain}`);
        return {
            impersonation: true,
            targetTenantId: tenant.id,
            targetSubdomain: tenant.subdomain,
            impersonationToken: `impersonate_${tenant.id}_${Buffer.from(Date.now().toString()).toString('base64')}`,
            expiresIn: 3600
        };
    }
}
