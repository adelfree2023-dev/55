import { HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalExceptionFilter (S5)', () => {
    const filter = new GlobalExceptionFilter();

    const getMockHost = (mockResponse: any) => ({
        switchToHttp: mock(() => ({
            getResponse: mock(() => mockResponse),
            getRequest: mock(() => ({ url: '/test' })),
        })),
    } as any);

    it('should format HttpException correctly', () => {
        const mockResponse = {
            status: mock(() => ({
                send: mock(() => { }),
            })),
        };
        const host = getMockHost(mockResponse);
        const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

        filter.catch(exception, host);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should handle generic errors as 500', () => {
        const mockResponse = {
            status: mock(() => ({
                send: mock(() => { }),
            })),
        };
        const host = getMockHost(mockResponse);
        const exception = new Error('Something went wrong');

        filter.catch(exception, host);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
});
