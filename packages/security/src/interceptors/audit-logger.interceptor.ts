import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { auditLogs } from '../../../db/src/schema/audit-logs';

@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
    private static pool = new Pool({ connectionString: process.env.DATABASE_URL });
    private static db = drizzle(this.pool);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user?.id || 'anonymous';
        const tenantId = request.tenantId || null;
        const action = `${request.method}:${request.route.path}`;
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: (data) => {
                    this.logAudit({
                        tenantId,
                        userId: user,
                        action,
                        status: 'success',
                        duration: Date.now() - startTime,
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                        payload: this.sanitizePayload(request.body),
                        response: this.sanitizeResponse(data),
                    });
                },
                error: (error) => {
                    this.logAudit({
                        tenantId,
                        userId: user,
                        action,
                        status: 'error',
                        duration: Date.now() - startTime,
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                        payload: this.sanitizePayload(request.body),
                        error: error.message,
                    });
                },
            }),
        );
    }

    private async logAudit(entry: any) {
        try {
            await AuditLoggerInterceptor.db.insert(auditLogs).values(entry);
        } catch (e) {
            console.error('❌ Failed to write audit log:', e);
        }
    }

    private sanitizePayload(payload: any) {
        if (!payload) return null;
        const { password, token, secret, ...safe } = payload;
        return JSON.stringify(safe);
    }

    private sanitizeResponse(response: any) {
        if (!response || typeof response !== 'object') return null;
        return JSON.stringify(response);
    }
}
