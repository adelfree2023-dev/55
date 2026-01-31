import { describe, it, expect, mock } from 'bun:test';
import { RateLimiterMiddleware } from '../../packages/security/src/middlewares/rate-limiter.middleware';

describe('S6 Integration Test', () => {
    it('should handle rate limiting requests', async () => {
        console.log('🔍 Execution: S6 Rate Limiting Test');

        const middleware = new RateLimiterMiddleware();
        (middleware as any).logger = { log: mock(), warn: mock(), error: mock() };

        const mockReq = { ip: '127.0.0.1', path: '/api/health' } as any;
        const mockRes = {
            status: mock(() => ({ json: mock() })),
            setHeader: mock(() => { })
        } as any;

        let nextCalled = 0;
        const mockNext = () => { nextCalled++; };

        // Mock Redis client (Static)
        (RateLimiterMiddleware as any).client = {
            isOpen: true,
            incr: mock(() => Promise.resolve(1)),
            expire: mock(() => Promise.resolve()),
            quit: mock(() => Promise.resolve()),
            connect: mock(() => Promise.resolve()),
            on: mock()
        };
        (RateLimiterMiddleware as any).isConnected = true;

        for (let i = 0; i < 5; i++) {
            await middleware.use(mockReq, mockRes, mockNext);
        }

        expect(nextCalled).toBe(5);
        expect(mockRes.setHeader).toHaveBeenCalled();
    });
});
