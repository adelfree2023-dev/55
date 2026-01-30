import { describe, it, expect, mock } from 'bun:test';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware (S7)', () => {
    it('should apply all security headers', () => {
        const middleware = new SecurityHeadersMiddleware();
        const headers: Record<string, string> = {};
        const mockRes = {
            setHeader: mock((key: string, value: string) => {
                headers[key] = value;
            })
        };
        const mockNext = mock(() => { });

        middleware.use({} as any, mockRes as any, mockNext);

        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['X-XSS-Protection']).toBe('1; mode=block');
        expect(headers['Content-Security-Policy']).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
    });
});
