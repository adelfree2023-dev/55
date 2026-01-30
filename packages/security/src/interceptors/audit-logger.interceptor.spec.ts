import { describe, it, expect, mock } from 'bun:test';
import { AuditLoggerInterceptor } from './audit-logger.interceptor';
import { of, throwError } from 'rxjs';

describe('AuditLoggerInterceptor (S3)', () => {
    it('should log success audit', async () => {
        const interceptor = new AuditLoggerInterceptor();
        const mockRequest = {
            method: 'POST',
            route: { path: '/test' },
            user: { id: 'user-1' },
            tenantId: 'tenant-1',
            ip: '127.0.0.1',
            headers: { 'user-agent': 'test-bot' },
            body: { password: 'secret', name: 'safe' }
        };
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => mockRequest
            })
        } as any;
        const mockHandler = {
            handle: () => of({ result: 'ok' })
        } as any;

        // Mock DB insert
        const insertMock = mock(() => ({ values: () => Promise.resolve() }));
        (AuditLoggerInterceptor as any).db = { insert: insertMock };

        const observable = interceptor.intercept(mockContext, mockHandler);

        await new Promise((resolve) => {
            observable.subscribe({
                next: (val) => {
                    expect(val).toEqual({ result: 'ok' });
                    resolve(null);
                }
            });
        });

        expect(insertMock).toHaveBeenCalled();
    });

    it('should log error audit', async () => {
        const interceptor = new AuditLoggerInterceptor();
        const mockRequest = {
            method: 'GET',
            route: { path: '/fail' },
            ip: '127.0.0.1',
            headers: {},
            body: {}
        };
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => mockRequest
            })
        } as any;
        const mockHandler = {
            handle: () => throwError(() => new Error('Test Failure'))
        };

        const insertMock = mock(() => ({ values: () => Promise.resolve() }));
        (AuditLoggerInterceptor as any).db = { insert: insertMock };

        const observable = interceptor.intercept(mockContext, mockHandler as any);

        try {
            await new Promise((_, reject) => {
                observable.subscribe({
                    error: (err) => {
                        expect(err.message).toBe('Test Failure');
                        reject(err);
                    }
                });
            });
        } catch (e) { }

        expect(insertMock).toHaveBeenCalled();
    });
});
