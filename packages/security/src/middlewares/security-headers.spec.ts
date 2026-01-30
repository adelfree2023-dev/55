import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware (S7)', () => {
    it('should set security headers correctly', () => {
        const middleware = new SecurityHeadersMiddleware();
        const headers: Record<string, string> = {};
        const mockRes = {
            setHeader: jest.fn((key: string, value: string) => {
                headers[key] = value;
            })
        } as any;
        const mockNext = jest.fn();

        middleware.use({} as any, mockRes, mockNext);

        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(mockNext).toHaveBeenCalled();
    });
});
