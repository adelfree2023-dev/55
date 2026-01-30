import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SchemaCreatorService } from './schema-creator.service';

describe('SchemaCreatorService', () => {
    let service: SchemaCreatorService;
    let mockPool: any;
    let mockDb: any;

    beforeEach(() => {
        // Simple direct mocks
        mockPool = {
            query: mock(() => Promise.resolve({ rows: [] }))
        };

        mockDb = {
            execute: mock(() => Promise.resolve())
        };

        // Inject mocks via constructor
        service = new SchemaCreatorService(mockPool, mockDb);
    });

    it('should create schema if not exists', async () => {
        // Setup state
        mockPool.query.mockResolvedValueOnce({ rows: [] }); // Schema does not exist

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');

        // precise call checks
        expect(mockDb.execute).toHaveBeenCalledTimes(3);

        // Check arguments directly
        const calls = mockDb.execute.mock.calls;
        expect(calls[0][0]).toContain('CREATE SCHEMA');
        expect(calls[1][0]).toContain('GRANT ALL');

        // For the SQL tag call (audit log), it might be an object
        // We can check it safely
        const auditCall = calls[2][0];
        const auditText = typeof auditCall === 'string' ? auditCall : JSON.stringify(auditCall);
        expect(auditText).toContain('audit_logs');
    });

    it('should return existing schema if idempotent', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ schema_name: 'tenant_test-id' }] });

        const result = await service.createSchema('test-id');

        expect(result).toBe('tenant_test-id');
        expect(mockDb.execute).toHaveBeenCalledTimes(1); // Only audit
    });

    it('should set search path', async () => {
        await service.setSearchPath('test-id');
        expect(mockDb.execute).toHaveBeenCalled();
        const call = mockDb.execute.mock.lastCall[0];
        const text = typeof call === 'string' ? call : JSON.stringify(call);
        expect(text).toContain('SET search_path');
    });
});
