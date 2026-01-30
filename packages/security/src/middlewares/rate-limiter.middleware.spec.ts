import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { RateLimiterMiddleware } from './rate-limiter.middleware';

describe('RateLimiterMiddleware (S6)', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        mockReq = { ip: '127.0.0.1', path: '/test' };
        mockRes = {
            status: mock(() => mockRes),
            json: mock(() => mockRes),
            setHeader: mock(() => { }),
        };
        mockNext = mock(() => { });
    });

    it('should permit request if below limit', async () => {
        const mockClient = {
            isOpen: true,
            incr: mock(() => Promise.resolve(5)),
            expire: mock(() => Promise.resolve()),
        };
        (RateLimiterMiddleware as any).client = mockClient;

        await RateLimiterMiddleware.use(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });

    it('should block request if above limit', async () => {
        const mockClient = {
            isOpen: true,
            incr: mock(() => Promise.resolve(101)),
        };
        (RateLimiterMiddleware as any).client = mockClient;

        await RateLimiterMiddleware.use(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should connect if client is closed', async () => {
        const mockClient = {
            isOpen: false,
            connect: mock(() => Promise.resolve()),
            incr: mock(() => Promise.resolve(1)),
            expire: mock(() => Promise.resolve()),
        };
        (RateLimiterMiddleware as any).client = mockClient;

        await RateLimiterMiddleware.use(mockReq, mockRes, mockNext);

        expect(mockClient.connect).toHaveBeenCalled();
    });
});
