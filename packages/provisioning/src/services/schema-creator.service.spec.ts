import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Define mocks BEFORE importing the service
const mockExecute = mock(() => Promise.resolve());
const mockQuery = mock(() => Promise.resolve({ rows: [] }));

// Mock drizzle-orm main package to control 'sql'
const fakeSql: any = (strings: any, ...values: any[]) => ({ text: strings[0], values, isFake: true });
fakeSql.raw = (str: string) => ({ text: str, isRaw: true });

mock.module('drizzle-orm', () => ({
    sql: fakeSql
}));

mock.module('drizzle-orm/node-postgres', () => ({
    drizzle: () => ({
        execute: mockExecute
    })
}));

mock.module('pg', () => ({
    Pool: class {
        query = mockQuery;
        constructor() { }
    }
}));

describe('SchemaCreatorService', () => {
    let SchemaCreatorService: any;
    let service: any;

    beforeEach(async () => {
        mockExecute.mockClear();
        mockQuery.mockClear();

        // Clear module validation cache if needed, but dynamic import helps
        const module = await import('./schema-creator.service');
        SchemaCreatorService = module.SchemaCreatorService;
        service = new SchemaCreatorService();
    });

    it('should create schema if not exists', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        expect(mockExecute).toHaveBeenCalledTimes(3);

        // Now we can reasonably expect objects with .text because of our mock
        // But wait, createSchema uses execute(string), not sql tagged template for the first calls.

        // Assertions for string calls
        expect(mockExecute.mock.calls[0][0]).toContain('CREATE SCHEMA');
        expect(mockExecute.mock.calls[1][0]).toContain('GRANT ALL');

        // Assertion for Audit Log (uses sql tag)
        const auditCall = mockExecute.mock.calls[2][0];
        expect(auditCall.isFake).toBe(true);
        expect(auditCall.text).toContain('INSERT INTO public.audit_logs');
    });

    it('should return existing schema if idempotent', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test-id' }] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        expect(mockExecute).toHaveBeenCalledTimes(1);

        const auditCall = mockExecute.mock.calls[0][0];
        expect(auditCall.isFake).toBe(true);
    });

    it('should set search path', async () => {
        await service.setSearchPath('test-id');
        expect(mockExecute).toHaveBeenCalled();
        const call = mockExecute.mock.lastCall[0];
        // uses sql.raw
        expect(call.isRaw).toBe(true);
        expect(call.text).toContain('SET search_path');
    });

    it('should handle db errors gracefully', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Connection failed'));
        try {
            await service.createSchema('test-fail');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toContain('Connection failed');
        }
    });
});
