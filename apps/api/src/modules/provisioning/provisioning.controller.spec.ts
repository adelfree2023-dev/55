// Set dummy env vars for Zod validation in @apex/config
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_ACCESS_KEY = 'minio';
process.env.MINIO_SECRET_KEY = 'minio123';

import { ProvisioningController } from './provisioning.controller';

describe('ProvisioningController', () => {
    let controller: ProvisioningController;
    let mockService: any;

    beforeEach(() => {
        mockService = {
            provisionTenant: jest.fn(),
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

            mockService.provisionTenant.mockResolvedValue({ success: true, id: 'tenant_123' });

            const result = await controller.createTenant(dto);

            expect(mockService.provisionTenant).toHaveBeenCalledWith(dto);
            expect(result).toEqual({ success: true, id: 'tenant_123' });
        });

        it('should handle service level errors', async () => {
            const dto: any = { subdomain: 'fail' };
            mockService.provisionTenant.mockRejectedValue(new Error('Prov Error'));

            await expect(controller.createTenant(dto)).rejects.toThrow('Prov Error');
        });

        it('should handle service level errors (e.g. repeated domain)', async () => {
            const dto: any = { subdomain: 'existing' };
            mockService.provisionTenant.mockRejectedValue(new Error('Domain already exists'));

            await expect(controller.createTenant(dto)).rejects.toThrow('Domain already exists');
        });

        it('should handle stripe failure simulation', async () => {
            const dto: any = { subdomain: 'stripe-fail' };
            mockService.provisionTenant.mockRejectedValue(new Error('Stripe payment failed'));

            await expect(controller.createTenant(dto)).rejects.toThrow('Stripe payment failed');
        });
    });

    describe('handleStripeWebhook', () => {
        it('should return received: true', async () => {
            const result = await controller.handleStripeWebhook({ id: 'evt_123' }, 'sig_123');
            expect(result).toEqual({ received: true });
        });
    });
});
