import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SchemaCreatorService } from './schema-creator.service';

const mockExecute = mock(() => Promise.resolve());
const mockQuery = mock(() => Promise.resolve({ rows: [] }));

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
    let service: SchemaCreatorService;

    beforeEach(() => {
        mockExecute.mockClear();
        mockQuery.mockClear();
        service = new SchemaCreatorService();
    });

    it('should create schema if not exists', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Schema does not exist

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        // 1. Create Schema
        // 2. Grant Privileges
        // 3. Log Audit
        expect(mockExecute).toHaveBeenCalledTimes(3);
        expect(mockExecute.mock.calls[0][0]).toContain('CREATE SCHEMA');
        expect(mockExecute.mock.calls[1][0]).toContain('GRANT ALL');
        expect(mockExecute.mock.calls[2][0].text).toContain('INSERT INTO public.audit_logs');
    });

    it('should return existing schema if idempotent', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test-id' }] }); // Schema exists

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        // Only Audit Log
        expect(mockExecute).toHaveBeenCalledTimes(1);
        expect(mockExecute.mock.calls[0][0].text).toContain('INSERT INTO public.audit_logs');
    });

    it('should handle creation errors', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockExecute.mockRejectedValueOnce(new Error('DB Error'));

        try {
            await service.createSchema('test-id');
            expect(true).toBe(false); // Should not reach here
        } catch (e) {
            expect(e.message).toContain('Schema creation failed: DB Error');
        }
    });

    it('should set search path', async () => {
        await service.setSearchPath('test-id');
        expect(mockExecute).toHaveBeenCalled();
        expect(mockExecute.mock.calls[0][0].text).toContain('SET search_path');
    });
});
