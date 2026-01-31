import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        const tenantId = (request as any).tenantId || 'unknown';
        const ip = request.ip || request.headers?.['x-forwarded-for'] || 'unknown';

        if (status >= 500) {
            this.logger.error(`System Error [Tenant: ${tenantId}, IP: ${ip}]: ${exception}`, (exception as any)?.stack);
        } else {
            this.logger.warn(`Client Error [Tenant: ${tenantId}, IP: ${ip}, Path: ${request.url}]: ${typeof message === 'object' ? JSON.stringify(message) : message}`);
        }

        const responseBody = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: typeof message === 'object' ? (message as any).message : message,
        };

        try {
            if (typeof response.code === 'function') {
                response.code(status).send(responseBody);
            } else if (typeof response.status === 'function') {
                response.status(status).send(responseBody);
            } else {
                response.statusCode = status;
                if (typeof response.setHeader === 'function') {
                    response.setHeader('Content-Type', 'application/json');
                }
                response.end(JSON.stringify(responseBody));
            }
        } catch (err: any) {
            this.logger.error(`Failed to send error response: ${err.message}`);
        }
    }
}
