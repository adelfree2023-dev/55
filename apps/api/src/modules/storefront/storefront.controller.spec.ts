import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

describe('StorefrontController', () => {
    let controller: StorefrontController;
    let service: StorefrontService;

    beforeEach(() => {
        service = {
            getHomePage: mock(() => Promise.resolve({
                tenant: { id: 'test-tenant', name: 'Test Store' },
                sections: {},
                metadata: {}
            })),
            invalidateCache: mock(() => Promise.resolve()),
            warmCache: mock(() => Promise.resolve()),
        } as any;

        controller = new StorefrontController(service);
    });

    it('should get home page data', async () => {
        const result = await controller.getHomePage('test-tenant');

        expect(service.getHomePage).toHaveBeenCalledWith('test-tenant');
        expect(result.tenant.name).toBe('Test Store');
    });

    it('should refresh home page cache', async () => {
        const result = await controller.refreshHomePage('test-tenant');

        expect(service.invalidateCache).toHaveBeenCalledWith('test-tenant');
        expect(service.warmCache).toHaveBeenCalledWith('test-tenant');
        expect(result.success).toBe(true);
        expect(result.message).toContain('test-tenant');
    });
});
