import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * ARCH-S2 §4.1: Tenant Scope Guard
 * Enforces that authenticated users can only access data belonging to their own tenant.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const tenantId = request.tenantId;

        // Bypassing for public routes or if auth isn't enforced yet
        if (!user) {
            return true;
        }

        // Super Admins have global access
        if (user.role === 'super-admin' || user.isSuperAdmin === true) {
            return true;
        }

        if (!tenantId) {
            throw new ForbiddenException('Tenant context missing');
        }

        // VALIDATION: User's tenant MUST match the requested tenant context
        if (user.tenantId && user.tenantId !== tenantId) {
            throw new ForbiddenException('Access Denied: Cross-tenant operation detected');
        }

        return true;
    }
}
