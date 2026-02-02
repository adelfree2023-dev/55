// Set dummy env vars for Zod validation in @apex/config
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_ACCESS_KEY = 'minio';
process.env.MINIO_SECRET_KEY = 'minio123';

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ProvisioningController } from './provisioning.controller';

describe('ProvisioningController', () => {
    let controller: ProvisioningController;
    let mockService: any;

    beforeEach(() => {
        mockService = {
            provisionTenant: mock(() => Promise.resolve({ success: true, id: 'tenant_123' })),
            validateSubdomain: mock(() => Promise.resolve(true)),
        };

        // Direct instantiation
        controller = new ProvisioningController(mockService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createTenant', () => {
        it('should call provisioningService.provisionTenant', async () => {
            const dto: any = {
                subdomain: 'test',
                ownerEmail: 'test@example.com',
            };

            mockService.provisionTenant = mock(() => Promise.resolve({ success: true, id: 'tenant_123' }));

            const result = await controller.createTenant(dto);

            expect(mockService.provisionTenant).toHaveBeenCalledWith(dto);
            expect(result).toEqual({ success: true, id: 'tenant_123' });
        });

        it('should handle service level errors', async () => {
            const dto: any = { subdomain: 'fail' };
            mockService.provisionTenant = mock(() => Promise.reject(new Error('Prov Error')));

            try {
                await controller.createTenant(dto);
                expect(true).toBe(false);
            } catch (err: any) {
                expect(err.message).toBe('Prov Error');
            }
        });

        it('should handle service level errors (e.g. repeated domain)', async () => {
            const dto: any = { subdomain: 'existing' };
            mockService.provisionTenant = mock(() => Promise.reject(new Error('Domain already exists')));

            try {
                await controller.createTenant(dto);
                expect(true).toBe(false);
            } catch (err: any) {
                expect(err.message).toBe('Domain already exists');
            }
        });

        it('should handle stripe failure simulation', async () => {
            const dto: any = { subdomain: 'stripe-fail' };
            mockService.provisionTenant = mock(() => Promise.reject(new Error('Stripe payment failed')));

            try {
                await controller.createTenant(dto);
                expect(true).toBe(false);
            } catch (err: any) {
                expect(err.message).toBe('Stripe payment failed');
            }
        });
    });

    describe('handleStripeWebhook', () => {
        it('should return received: true', async () => {
            const result = await controller.handleStripeWebhook({ id: 'evt_123' }, 'sig_123');
            expect(result).toEqual({ received: true });
        });
    });
});
