import { describe, it, expect, mock } from 'bun:test';
import { TenantIsolationMiddleware } from '../../packages/db/src/middleware/tenant-isolation';

describe('S2 Integration Test', () => {
    it('should isolate tenant successfully', async () => {
        console.log('🔍 Execution: S2 Isolation Test');
        const testHostname = 'tenant-a.apex.local';

        // Mocking the database pool
        const queryMock = mock((sql: string, params: any[]) => {
            console.log(`[MockDB] SQL: ${sql} | Params: ${params}`);

            if (sql.includes('public.tenants')) {
                // Return valid tenant
                return Promise.resolve({ rows: [{ id: 'uuid-integration-test', status: 'active' }] });
            }
            if (sql.includes('information_schema.schemata')) {
                // Return valid schema
                return Promise.resolve({ rows: [{ schema_name: 'tenant_tenant-a' }] });
            }
            if (sql.includes('SET search_path')) {
                return Promise.resolve({ rows: [] });
            }

            return Promise.resolve({ rows: [] });
        });

        (TenantIsolationMiddleware as any).pool = {
            query: queryMock,
            end: mock(() => Promise.resolve())
        };

        const mockReq = { hostname: testHostname } as any;
        let nextCalled = false;
        const mockNext = () => {
            console.log('✅ S2: Middleware called next()');
            nextCalled = true;
        };
        const mockRes = {
            status: mock((code: number) => {
                console.log(`❌ S2 Status: ${code}`);
                return {
                    json: mock((data: any) => console.log('❌ S2 Error Data:', data))
                };
            })
        } as any;

        await TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext);
        expect(nextCalled).toBe(true);
        expect(mockReq.tenantId).toBe('uuid-integration-test');
    });
});
