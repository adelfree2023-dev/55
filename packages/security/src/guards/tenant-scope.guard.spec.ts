import { TenantScopeGuard } from './tenant-scope.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('TenantScopeGuard', () => {
    let guard: TenantScopeGuard;
    let mockContext: Partial<ExecutionContext>;
    let mockRequest: any;

    beforeEach(() => {
        guard = new TenantScopeGuard();
        mockRequest = {
            user: undefined,
            tenantId: undefined,
        };
        mockContext = {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            } as any),
        };
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access if user is not authenticated', () => {
        const result = guard.canActivate(mockContext as ExecutionContext);
        expect(result).toBe(true);
    });

    it('should allow access for super-admin', () => {
        mockRequest.user = { role: 'super-admin' };
        const result = guard.canActivate(mockContext as ExecutionContext);
        expect(result).toBe(true);
    });

    it('should throw ForbiddenException if tenant context missing for authenticated user', () => {
        mockRequest.user = { role: 'user', tenantId: 't1' };
        mockRequest.tenantId = undefined; // Missing context
        expect(() => guard.canActivate(mockContext as ExecutionContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException on cross-tenant access', () => {
        mockRequest.user = { role: 'user', tenantId: 'tenant-A' };
        mockRequest.tenantId = 'tenant-B'; // Mismatch
        expect(() => guard.canActivate(mockContext as ExecutionContext)).toThrow(ForbiddenException);
    });

    it('should allow access when tenant IDs match', () => {
        mockRequest.user = { role: 'user', tenantId: 'tenant-A' };
        mockRequest.tenantId = 'tenant-A'; // Match
        const result = guard.canActivate(mockContext as ExecutionContext);
        expect(result).toBe(true);
    });
});
