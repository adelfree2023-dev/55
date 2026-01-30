import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SchemaCreatorService } from './schema-creator.service';

// Mock dependencies
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
        // Mock schema checking returning empty (not exists)
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        // We expect calls for: CREATE SCHEMA, GRANT, AUDIT
        expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should return existing schema if idempotent', async () => {
        // Mock schema checking returning rows (exists)
        mockQuery.mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test-id' }] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        // Should only log audit (1 call), not create schema
        expect(mockExecute).toHaveBeenCalledTimes(1);
    });
});
