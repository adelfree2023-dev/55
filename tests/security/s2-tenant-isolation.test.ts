import { TenantIsolationMiddleware } from '../../packages/db/src/middleware/tenant-isolation';

console.log('🔍 Execution: S2 Isolation Test');
const testHostname = process.env.TEST_HOSTNAME || 'tenant-a.apex.local';
console.log('🌐 Testing Hostname:', testHostname);
console.log('🔹 Extracted Subdomain:', testHostname.split('.')[0]);

// Mocking Request/Response for logic verification
const mockReq = { hostname: testHostname } as any;
const mockRes = {
    status: (code: number) => ({
        json: (data: any) => {
            console.error(`❌ S2 Failure (Code ${code}):`, data);
            process.exit(1);
        }
    })
} as any;
const mockNext = () => console.log('✅ S2: Tenant isolated successfully (Middleware passed to next)');

TenantIsolationMiddleware.setTenantSchema(mockReq, mockRes, mockNext).then(async () => {
    await TenantIsolationMiddleware.pool.end();
});
