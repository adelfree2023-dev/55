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
            status: mock(() => ({
                json: mock(() => { }),
            })),
        };
        mockNext = mock(() => { });
    });

    it('should extract subdomain and set tenant schema if tenant exists', async () => {
        // We need to mock the DB pool query
        const mockQueryResult = {
            rows: [{ id: 'uuid-1', status: 'active' }],
        };
        const mockSchemaResult = {
            rows: [{ schema_name: 'tenant_tenant1' }],
        };

        // Inject mock pool
        (TenantIsolationMiddleware as any).pool = {
            query: mock((sql: string, params: any[]) => {
                if (sql.includes('public.tenants')) return Promise.resolve(mockQueryResult);
                if (sql.includes('information_schema.schemata')) return Promise.resolve(mockSchemaResult);
                if (sql.includes('SET search_path')) return Promise.resolve({});
                return Promise.resolve({ rows: [] });
            }),
            end: mock(() => Promise.resolve()),
        };

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockReq.tenantId).toBe('uuid-1');
        expect(mockReq.tenantSchema).toBe('tenant_tenant1');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 if tenant does not exist', async () => {
        (TenantIsolationMiddleware as any).pool = {
            query: mock(() => Promise.resolve({ rows: [] })),
        };

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 503 if tenant schema does not exist', async () => {
        const mockQueryResult = {
            rows: [{ id: 'uuid-1', status: 'active' }],
        };
        (TenantIsolationMiddleware as any).pool = {
            query: mock((sql: string, params: any[]) => {
                if (sql.includes('public.tenants')) return Promise.resolve(mockQueryResult);
                if (sql.includes('information_schema.schemata')) return Promise.resolve({ rows: [] });
                return Promise.resolve({ rows: [] });
            }),
        };

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(503);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
