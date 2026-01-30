import { RateLimiterMiddleware } from '../../packages/security/src/middlewares/rate-limiter.middleware';

console.log('🔍 Execution: S6 Rate Limiting Test');
async function runTest() {
    const mockReq = { ip: '127.0.0.1', path: '/api/health' } as any;
    const mockRes = {
        status: (code: number) => ({ json: (data: any) => console.log(`Response ${code}:`, data) }),
        setHeader: (name: string, value: string) => { }
    } as any;
    const mockNext = () => console.log('✅ S6: Request permitted');

    // Simulate 5 requests
    for (let i = 0; i < 5; i++) {
        await RateLimiterMiddleware.use(mockReq, mockRes, mockNext);
    }
}

runTest().catch(console.error);
