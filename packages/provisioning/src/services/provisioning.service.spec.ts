import { describe, it, expect, mock, beforeEach } from 'bun:test';
// import { ProvisioningService } from './provisioning.service'; (Removed)

mock.module('@apex/provisioning', () => ({
    SchemaCreatorService: class { },
    DataSeederService: class { },
    TraefikRouterService: class { }
}));
mock.module('@apex/encryption', () => ({
    EncryptionService: class { }
}));
mock.module('@nestjs/event-emitter', () => ({
    EventEmitter2: class { },
    TenantProvisionedEvent: class { },
    TenantFailedEvent: class { }
}));
mock.module('pg', () => ({
    Pool: class { }
}));

mock.module('./events/tenant-provisioned.event', () => ({
    TenantProvisionedEvent: class { }
}));
mock.module('./events/tenant-failed.event', () => ({
    TenantFailedEvent: class { }
}));

const { ProvisioningService } = require('./provisioning.service');

describe('ProvisioningService', () => {
    let service: any;
    let mockSchemaCreator: any;
    let mockDataSeeder: any;
    let mockTraefikRouter: any;
    let mockEventEmitter: any;
    let mockEncryptionService: any;
    let mockPool: any;

    beforeEach(() => {
        // Setup mocks
        mockSchemaCreator = { createSchema: mock(() => Promise.resolve('tenant_schema')) };
        mockDataSeeder = { seedData: mock(() => Promise.resolve()) };
        mockTraefikRouter = { createRoute: mock(() => Promise.resolve()) };
        mockEventEmitter = { emit: mock() };
        mockEncryptionService = { encrypt: mock((val: string) => Promise.resolve('encrypted_' + val)) };
        mockPool = { query: mock(() => Promise.resolve({ rows: [] })) };

        service = new ProvisioningService(
            mockSchemaCreator,
            mockDataSeeder,
            mockTraefikRouter,
            mockEventEmitter,
            mockEncryptionService,
            mockPool
        );

        // Mock logger
        (service as any).logger = {
            log: mock(),
            error: mock(),
            warn: mock(),
            debug: mock(),
        };
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should provision tenant successfully', async () => {
        const dto = { subdomain: 'test', ownerEmail: 'test@example.com' };

        const result = await service.provisionTenant(dto);

        expect(result.success).toBe(true);
        expect(mockSchemaCreator.createSchema).toHaveBeenCalledWith('test');
        expect(mockDataSeeder.seedData).toHaveBeenCalledWith('test', 'standard');
        expect(mockTraefikRouter.createRoute).toHaveBeenCalledWith('test');
        expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('test@example.com');
        expect(mockPool.query).toHaveBeenCalledTimes(2); // Insert tenant + Audit
        expect(mockEventEmitter.emit).toHaveBeenCalledWith('tenant.provisioned', expect.any(Object));
        expect((service as any).logger.debug).toHaveBeenCalledTimes(4); // 4 phases
        expect((service as any).logger.log).toHaveBeenCalled();
    });

    it('should log warning if provisioning exceeds threshold', async () => {
        const dto = { subdomain: 'slow', ownerEmail: 'slow@example.com' };

        // Mock schema creator to be slow
        mockSchemaCreator.createSchema = mock(async () => {
            await new Promise(resolve => setTimeout(resolve, 56)); // > 55ms? No threshold is 55000ms (55s)
            // We can't actually wait 55s in test.
            // We mock Date.now() instead.
            return 'schema';
        });

        // Mock Date.now override
        const originalDateNow = Date.now;
        let time = 0;
        Date.now = () => {
            time += 60000; // Increment big step
            return time;
        };

        try {
            await service.provisionTenant(dto);
            // logger.warn should be called
            expect((service as any).logger.warn).toHaveBeenCalledWith(expect.stringContaining('PROVISIONING EXCEEDED'));
        } finally {
            Date.now = originalDateNow;
        }
    });

    it('should handle provisioning failure and emit failed event', async () => {
        const dto = { subdomain: 'fail', ownerEmail: 'fail@example.com' };

        mockSchemaCreator.createSchema = mock(() => Promise.reject(new Error('Schema Error')));

        await expect(service.provisionTenant(dto)).rejects.toThrow('Provisioning failed: Schema Error');

        expect(mockEventEmitter.emit).toHaveBeenCalledWith('tenant.failed', expect.any(Object));
        expect((service as any).logger.error).toHaveBeenCalled();
    });

    it('should validate subdomain availability', async () => {
        // Taken
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
        await expect(service.validateSubdomain('taken')).rejects.toThrow('already taken');

        // Invalid format
        await expect(service.validateSubdomain('Invalid!')).rejects.toThrow('Invalid subdomain format');

        // Valid
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        expect(await service.validateSubdomain('valid-123')).toBe(true);
    });
});
