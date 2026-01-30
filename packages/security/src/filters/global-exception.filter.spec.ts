import { describe, it, expect, mock } from 'bun:test';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter (S5)', () => {
    it('should format HttpException correctly', () => {
        const filter = new GlobalExceptionFilter();
        const mockResponse = {
            status: mock(() => ({
                send: mock(() => { }),
            })),
        };
        const mockArgumentsHost = {
            switchToHttp: mock(() => ({
                getResponse: mock(() => mockResponse),
                getRequest: mock(() => ({ url: '/test' })),
            })),
        };

        const exception = {
            getStatus: () => 403,
            getResponse: () => ({ message: 'Forbidden' }),
        };

        filter.catch(exception as any, mockArgumentsHost as any);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
});
