import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { setSchemaPath } from '@apex/db';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
        const tenantId = req.headers['x-tenant-id'] as string;

        if (!tenantId) {
            throw new BadRequestException('X-Tenant-Id header is required');
        }

        try {
            // Set the database search path for the current request context
            await setSchemaPath(tenantId);
            next();
        } catch (error) {
            throw new BadRequestException(`Invalid tenant: ${tenantId}`);
        }
    }
}
