// Set dummy env vars for Zod validation in @apex/config
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_ACCESS_KEY = 'minio';
process.env.MINIO_SECRET_KEY = 'minio123';

import { ProvisioningService } from './provisioning.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('ProvisioningService', () => {
    let service: ProvisioningService;
    let mockEventEmitter: any;
    let mockSchemaCreator: any;
    let mockDataSeeder: any;
    let mockTraefikRouter: any;
    let mockPool: any;

    beforeEach(() => {
        mockEventEmitter = { emit: jest.fn() };
        mockSchemaCreator = { createSchema: jest.fn() };
        mockDataSeeder = { seedData: jest.fn() };
        mockTraefikRouter = { createRoute: jest.fn() };
        mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }) };

        // Direct instantiation for 100% reliability in Bun
        service = new ProvisioningService(
            mockSchemaCreator,
            mockDataSeeder,
            mockTraefikRouter,
            mockEventEmitter,
            mockPool
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('provisionTenant', () => {
        it('should successfully provision a tenant', async () => {
            const dto: any = {
                subdomain: 'test-tenant',
                storeName: 'Test Store',
                ownerEmail: 'test@example.com',
                planId: 'basic',
            };

            mockSchemaCreator.createSchema.mockResolvedValue('tenant_test_tenant');
            mockDataSeeder.seedData.mockResolvedValue(undefined);
            mockTraefikRouter.createRoute.mockResolvedValue(undefined);

            const result = await service.provisionTenant(dto);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.subdomain).toBe(dto.subdomain);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('tenant.provisioned', expect.any(Object));
        });

        it('should throw error if any phase fails', async () => {
            const dto: any = {
                subdomain: 'fail-tenant',
                ownerEmail: 'fail@example.com',
            };

            mockSchemaCreator.createSchema.mockRejectedValue(new Error('Phase 1 Error'));

            await expect(service.provisionTenant(dto)).rejects.toThrow(InternalServerErrorException);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('tenant.failed', expect.any(Object));
        });
    });

    describe('validateSubdomain', () => {
        it('should return true for valid and available subdomain', async () => {
            const subdomain = 'valid-subdomain';
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await service.validateSubdomain(subdomain);
            expect(result).toBe(true);
        });

        it('should throw error for invalid format', async () => {
            await expect(service.validateSubdomain('Invalid_Subdomain')).rejects.toThrow();
        });
    });
});
