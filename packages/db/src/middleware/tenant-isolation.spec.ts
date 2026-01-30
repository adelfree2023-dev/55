import { TenantIsolationMiddleware } from './tenant-isolation';

// Mock pg Pool
jest.mock('pg', () => {
    return {
        Pool: jest.fn().mockImplementation(() => ({
            query: jest.fn(),
        })),
    };
});

describe('TenantIsolationMiddleware (S2) Unit Test', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            hostname: 'tenant1.apex.local',
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    it('should extract subdomain and set tenant schema if tenant exists', async () => {
        const mockQueryResult = { rows: [{ id: 'uuid-1', status: 'active' }] };
        const mockSchemaResult = { rows: [{ schema_name: 'tenant_tenant1' }] };

        const pool = (TenantIsolationMiddleware as any).pool;
        pool.query
            .mockResolvedValueOnce(mockQueryResult)
            .mockResolvedValueOnce(mockSchemaResult)
            .mockResolvedValueOnce({});

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockReq.tenantId).toBe('uuid-1');
        expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 if tenant not found', async () => {
        const pool = (TenantIsolationMiddleware as any).pool;
        pool.query.mockResolvedValueOnce({ rows: [] });

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 503 if schema missing', async () => {
        const mockQueryResult = { rows: [{ id: 'uuid-1', status: 'active' }] };
        const pool = (TenantIsolationMiddleware as any).pool;
        pool.query
            .mockResolvedValueOnce(mockQueryResult)
            .mockResolvedValueOnce({ rows: [] });

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it('should instantiate for constructor coverage', () => {
        const instance = new TenantIsolationMiddleware();
        expect(instance).toBeDefined();
    });
});
