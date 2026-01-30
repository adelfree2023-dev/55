import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { TenantIsolationMiddleware } from './tenant-isolation';

describe('TenantIsolationMiddleware (S2) Unit Test', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        mockReq = {
            hostname: 'tenant1.apex.local',
        };
        mockRes = {
            status: mock(() => mockRes),
            json: mock(() => mockRes),
        };
        mockNext = mock(() => { });

        // Mock pool.query directly on the class
        (TenantIsolationMiddleware as any).pool = {
            query: mock((sql: string) => {
                if (sql.includes('public.tenants')) return Promise.resolve({ rows: [{ id: 'uuid-1', status: 'active' }] });
                if (sql.includes('information_schema.schemata')) return Promise.resolve({ rows: [{ schema_name: 'tenant_tenant1' }] });
                return Promise.resolve({ rows: [] });
            })
        };
    });

    it('should extract subdomain and set tenant schema if tenant exists', async () => {
        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);
        expect(mockReq.tenantId).toBe('uuid-1');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 if tenant not found', async () => {
        (TenantIsolationMiddleware as any).pool.query = mock(() => Promise.resolve({ rows: [] }));
        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 503 if schema missing', async () => {
        (TenantIsolationMiddleware as any).pool.query = mock((sql: string) => {
            if (sql.includes('public.tenants')) return Promise.resolve({ rows: [{ id: 'uuid-1', status: 'active' }] });
            return Promise.resolve({ rows: [] });
        });
        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(503);
    });
});
