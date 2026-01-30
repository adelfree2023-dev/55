import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().url().min(1, 'REDIS_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    STRIPE_SECRET_KEY: z.string().optional(),
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);

// Fast fail on missing required variables
if (!env.DATABASE_URL) {
    console.error('❌ S1 VIOLATION: Missing required environment variables');
    process.exit(1);
}
