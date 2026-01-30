import { z } from 'zod';

export const TenantQuerySchema = z.object({
    status: z.enum(['active', 'suspended', 'pending']).optional(),
    plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export type TenantQuery = z.infer<typeof TenantQuerySchema>;
