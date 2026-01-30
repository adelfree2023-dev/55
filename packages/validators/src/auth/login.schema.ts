import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    tenantId: z.string().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
