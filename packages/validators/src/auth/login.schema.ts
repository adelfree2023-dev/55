import { z } from 'zod';

export const LoginSchema = z.object({
    subdomain: z.string().min(3).max(63),
    password: z.string().min(8),
});

export type LoginDto = z.infer<typeof LoginSchema>;
