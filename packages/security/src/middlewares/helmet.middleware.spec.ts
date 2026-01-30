import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { HelmetMiddleware } from './helmet.middleware';

describe('HelmetMiddleware (Arch-S8)', () => {
    let middleware: HelmetMiddleware;
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        middleware = new HelmetMiddleware();
        mockReq = {
            method: 'GET',
            headers: {},
        };
        mockRes = {
            setHeader: mock(() => { }),
        };
        mockNext = mock(() => { });
    });

    it('should set all required security headers', () => {
        middleware.use(mockReq, mockRes, mockNext);

        const setHeaderCalls = mockRes.setHeader.mock.calls;
        const headers = setHeaderCalls.map((call: any) => call[0]);

        expect(headers).toContain('Content-Security-Policy');
        expect(headers).toContain('Strict-Transport-Security');
        expect(headers).toContain('X-Frame-Options');
        expect(headers).toContain('X-Content-Type-Options');
        expect(headers).toContain('X-XSS-Protection');
        expect(headers).toContain('Referrer-Policy');
        expect(headers).toContain('Permissions-Policy');
        expect(headers).toContain('Cross-Origin-Opener-Policy');
        expect(headers).toContain('Cross-Origin-Embedder-Policy');

        expect(mockNext).toHaveBeenCalled();
    });

    it('should set CSP with proper directives', () => {
        middleware.use(mockReq, mockRes, mockNext);

        const cspCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Content-Security-Policy'
        );

        expect(cspCall).toBeDefined();
        expect(cspCall[1]).toContain("default-src 'self'");
        expect(cspCall[1]).toContain("frame-src 'none'");
        expect(cspCall[1]).toContain("object-src 'none'");
    });

    it('should set HSTS header correctly', () => {
        middleware.use(mockReq, mockRes, mockNext);

        const hstsCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Strict-Transport-Security'
        );

        expect(hstsCall).toBeDefined();
        expect(hstsCall[1]).toContain('max-age=31536000');
        expect(hstsCall[1]).toContain('includeSubDomains');
        expect(hstsCall[1]).toContain('preload');
    });

    it('should set CORS headers for trusted origins', () => {
        mockReq.headers.origin = 'http://localhost:3000';

        middleware.use(mockReq, mockRes, mockNext);

        const corsCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Access-Control-Allow-Origin'
        );

        expect(corsCall).toBeDefined();
        expect(corsCall[1]).toBe('http://localhost:3000');
    });

    it('should set CORS headers for tenant subdomains', () => {
        mockReq.headers.origin = 'http://test-tenant.apex.localhost';

        middleware.use(mockReq, mockRes, mockNext);

        const corsCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Access-Control-Allow-Origin'
        );

        expect(corsCall).toBeDefined();
        expect(corsCall[1]).toBe('http://test-tenant.apex.localhost');
    });

    it('should NOT set CORS headers for untrusted origins', () => {
        mockReq.headers.origin = 'https://evil.com';

        middleware.use(mockReq, mockRes, mockNext);

        const corsCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Access-Control-Allow-Origin'
        );

        expect(corsCall).toBeUndefined();
    });

    it('should skip COEP/COOP for OPTIONS requests', () => {
        mockReq.method = 'OPTIONS';

        middleware.use(mockReq, mockRes, mockNext);

        const coopCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Cross-Origin-Opener-Policy'
        );
        const coepCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'Cross-Origin-Embedder-Policy'
        );

        expect(coopCall).toBeUndefined();
        expect(coepCall).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('should set X-Frame-Options to DENY', () => {
        middleware.use(mockReq, mockRes, mockNext);

        const xFrameCall = mockRes.setHeader.mock.calls.find(
            (call: any) => call[0] === 'X-Frame-Options'
        );

        expect(xFrameCall).toBeDefined();
        expect(xFrameCall[1]).toBe('DENY');
    });
});
