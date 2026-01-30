import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Define mocks BEFORE importing the service
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
    let SchemaCreatorService: any;
    let service: any;

    beforeEach(async () => {
        mockExecute.mockClear();
        mockQuery.mockClear();

        // Dynamic import to ensure mocks are used
        const module = await import('./schema-creator.service');
        SchemaCreatorService = module.SchemaCreatorService;
        service = new SchemaCreatorService();
    });

    it('should create schema if not exists', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Schema does not exist

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should return existing schema if idempotent', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test-id' }] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should set search path', async () => {
        await service.setSearchPath('test-id');
        expect(mockExecute).toHaveBeenCalled();
        const call = mockExecute.mock.lastCall[0];
        // Check content of sql template or string
        const sqlText = call.text || call.toString();
        expect(sqlText).toContain('SET search_path');
    });

    it('should handle db errors gracefully', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Connection failed'));

        try {
            await service.createSchema('test-fail');
            expect(true).toBe(false); // Fail if no error thrown
        } catch (e) {
            expect(e.message).toContain('Connection failed');
        }
    });
});
