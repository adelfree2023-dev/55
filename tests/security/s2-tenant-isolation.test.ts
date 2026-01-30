import { TenantIsolationMiddleware } from '../../packages/db/src/middleware/tenant-isolation';

console.log('🔍 Execution: S2 Isolation Test');
// Mocking Request/Response for logic verification
const mockReq = { hostname: process.env.TEST_HOSTNAME || 'tenant-a.apex.local' } as any;
const mockRes = { status: (code: number) => ({ json: (data: any) => console.log(`Response ${code}:`, data) }) } as any;
const mockNext = () => console.log('✅ S2: Middleware passed to next()');

TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext).then(async () => {
    await TenantIsolationMiddleware.pool.end();
});
