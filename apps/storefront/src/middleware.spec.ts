import { expect, it, describe, mock, beforeEach, afterEach } from 'bun:test';

// Mock NextResponse
const mockNext = mock(() => ({ type: 'next' }));
const mockRewrite = mock((url: any) => ({ type: 'rewrite', url }));

mock.module('next/server', () => ({
    NextResponse: {
        next: mockNext,
        rewrite: mockRewrite
    }
}));

// Import AFTER mocking
import { middleware } from './middleware';

describe('Storefront Middleware', () => {
    beforeEach(() => {
        mockNext.mockClear();
        mockRewrite.mockClear();
    });

    afterEach(() => {
        mock.restore();
    });

    const createReq = (host: string, pathname: string) => {
        return {
            headers: {
                get: (key: string) => key === 'host' ? host : null
            },
            nextUrl: {
                pathname,
                clone: () => ({ pathname })
            }
        } as any;
    };

    it('should skip if no host header', () => {
        const req = createReq('', '/');
        middleware(req);
        expect(mockNext).toHaveBeenCalled();
    });

    it('should rewrite valid subdomain (duckdns)', () => {
        const req = createReq('tenant1.apex-v2.duckdns.org', '/page');
        middleware(req);
        expect(mockRewrite).toHaveBeenCalled();
        const url = mockRewrite.mock.calls[0][0];
        expect(url.pathname).toBe('/tenant1/page');
    });

    it('should rewrite valid subdomain (localhost)', () => {
        const req = createReq('tenant1.localhost:3000', '/');
        middleware(req);
        expect(mockRewrite).toHaveBeenCalled();
        const url = mockRewrite.mock.calls[0][0];
        expect(url.pathname).toBe('/tenant1/');
    });

    it('should skip reserved subdomains', () => {
        const reserved = ['api', 'www', 'storefront', 'localhost'];
        for (const sub of reserved) {
            const req = createReq(`${sub}.apex-v2.duckdns.org`, '/');
            middleware(req);
            expect(mockNext).toHaveBeenCalled();
            mockNext.mockClear();
        }
    });

    it('should not rewrite if already rewritten', () => {
        const req = createReq('tenant1.apex-v2.duckdns.org', '/tenant1/page');
        middleware(req);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRewrite).not.toHaveBeenCalled();
    });

    it('should skip internal paths is handled by config matcher usually but logic handles safe defaults', () => {
        // middleware logic calls next() if nothing matches
        const req = createReq('example.com', '/'); // No subdomain
        middleware(req);
        expect(mockNext).toHaveBeenCalled();
    });
});
