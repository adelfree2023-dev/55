// Rate Limiter Middleware Spec - S6 Compliant
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { RateLimiterMiddleware } from './rate-limiter.middleware';

describe('RateLimiterMiddleware (S6)', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        // Reset static state
        (RateLimiterMiddleware as any).client = undefined;
        (RateLimiterMiddleware as any).isConnected = false;

        mockReq = { ip: '127.0.0.1', path: '/test' };
        mockRes = {
            status: mock(() => mockRes),
            json: mock(() => mockRes),
            setHeader: mock(() => { }),
        };
        mockNext = mock(() => { });
    });

    it('should permit request if below limit', async () => {
        const middleware = new RateLimiterMiddleware();
        (middleware as any).logger = { log: mock(), warn: mock(), error: mock() };

        const mockClient = {
            isOpen: true,
            incr: mock(() => Promise.resolve(5)),
            expire: mock(() => Promise.resolve()),
            connect: mock(() => Promise.resolve()),
            on: mock()
        };
        (RateLimiterMiddleware as any).client = mockClient;
        (RateLimiterMiddleware as any).isConnected = true;

        await middleware.use(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });

    it('should block request if above limit', async () => {
        const middleware = new RateLimiterMiddleware();
        (middleware as any).logger = { log: mock(), warn: mock(), error: mock() };

        const mockClient = {
            isOpen: true,
            incr: mock(() => Promise.resolve(101)),
            connect: mock(() => Promise.resolve()),
            on: mock()
        };
        (RateLimiterMiddleware as any).client = mockClient;
        (RateLimiterMiddleware as any).isConnected = true;

        await expect(middleware.use(mockReq, mockRes, mockNext)).rejects.toThrow(
            require('@nestjs/common').HttpException
        );

        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should connect if client is closed', async () => {
        const middleware = new RateLimiterMiddleware();
        (middleware as any).logger = { log: mock(), warn: mock(), error: mock() };

        const mockClient = {
            isOpen: false,
            connect: mock(() => Promise.resolve()),
            incr: mock(() => Promise.resolve(1)),
            expire: mock(() => Promise.resolve()),
            on: mock()
        };
        (RateLimiterMiddleware as any).client = mockClient;
        (RateLimiterMiddleware as any).isConnected = false;

        await middleware.use(mockReq, mockRes, mockNext);

        expect(mockClient.connect).toHaveBeenCalled();
    });
});
