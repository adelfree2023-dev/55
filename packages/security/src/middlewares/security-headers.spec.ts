import { describe, it, expect, mock } from 'bun:test';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware (S7)', () => {
    it('should set security headers correctly', async () => {
        const middleware = new SecurityHeadersMiddleware();
        const headers: Record<string, string> = {};
        const mockRes = {
            setHeader: (key: string, value: string) => {
                headers[key] = value;
            }
        } as any;
        const mockNext = mock(() => { });

        await middleware.use({} as any, mockRes, mockNext);

        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['Strict-Transport-Security']).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
    });
});
