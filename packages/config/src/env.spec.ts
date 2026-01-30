import { describe, it, expect } from 'bun:test';
import { z } from 'zod';

// We test the schema logic specifically
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
});

describe('Env Validation (S1)', () => {
    it('should validate correct environment variables', () => {
        const validConfig = {
            DATABASE_URL: 'postgresql://localhost:5432/db',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'a'.repeat(32),
        };
        const result = envSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
    });

    it('should fail if JWT_SECRET is too short', () => {
        const invalidConfig = {
            DATABASE_URL: 'postgresql://localhost:5432/db',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'short',
        };
        const result = envSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });

    it('should fail if DATABASE_URL is not a URL', () => {
        const invalidConfig = {
            DATABASE_URL: 'not-a-url',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'a'.repeat(32),
        };
        const result = envSchema.safeParse(invalidConfig);
        expect(result.success).toBe(false);
    });
});
