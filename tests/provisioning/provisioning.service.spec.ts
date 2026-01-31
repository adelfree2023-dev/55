import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ProvisioningService } from '../../apps/api/src/modules/provisioning/provisioning.service';
import { TenantFailedEvent } from '../../apps/api/src/modules/provisioning/events/tenant-failed.event';

describe('ProvisioningService', () => {
    let service: ProvisioningService;
    let schemaCreator: any;
    let dataSeeder: any;
    let traefikRouter: any;
    let eventEmitter: any;
    let encryptionService: any; // Added mock
    let mockPool: any;

    beforeEach(() => {
        schemaCreator = { createSchema: mock(() => Promise.resolve('tenant_test')) };
        dataSeeder = { seedData: mock(() => Promise.resolve()) };
        traefikRouter = { createRoute: mock(() => Promise.resolve()) };
        eventEmitter = { emit: mock() };
        encryptionService = { encrypt: mock((val: string) => Promise.resolve(`enc:${val}`)) }; // Mock encrypt
        mockPool = { query: mock(() => Promise.resolve({ rows: [] })) };

        service = new ProvisioningService(
            schemaCreator,
            dataSeeder,
            traefikRouter,
            eventEmitter,
            encryptionService, // Injected
            mockPool
        );
    });

    it('should execute all 4 phases successfully', async () => {
        const dto = {
            subdomain: 'test-store',
            ownerEmail: 'test@example.com',
            storeName: 'Test Store',
            planId: 'basic' as const,
            blueprintId: 'standard'
        };

        const result = await service.provisionTenant(dto);
        console.log('Provision result:', JSON.stringify(result));

        expect(result.success).toBe(true);
        expect(result.schemaName).toBe('tenant_test');
        expect(schemaCreator.createSchema).toHaveBeenCalledWith('test-store');
        expect(dataSeeder.seedData).toHaveBeenCalledWith('test-store', 'standard');
        expect(traefikRouter.createRoute).toHaveBeenCalledWith('test-store');

        console.log('Pool calls:', mockPool.query.mock.calls.length);
        // Register phase expectations
        expect(mockPool.query).toHaveBeenCalledTimes(2); // Insert tenant + Audit
        expect(eventEmitter.emit).toHaveBeenCalled();
        const emitCall = eventEmitter.emit.mock.calls[0];
        console.log('Event Name:', emitCall[0]);
        console.log('Event Payload:', JSON.stringify(emitCall[1]));
        expect(emitCall[0]).toBe('tenant.provisioned');
        expect(emitCall[1].payload.duration).toBeDefined();
    });

    it('should handle provisioning errors', async () => {
        schemaCreator.createSchema.mockRejectedValue(new Error('DB Error'));

        const dto = { subdomain: 'fail', ownerEmail: 'test@example.com' };

        try {
            await service.provisionTenant(dto);
            expect(true).toBe(false); // Should fail
        } catch (e) {
            expect(e.message).toContain('Provisioning failed: DB Error');
        }

        expect(eventEmitter.emit).toHaveBeenCalled();
        const emitCall = eventEmitter.emit.mock.calls[0];
        expect(emitCall[0]).toBe('tenant.failed');
        expect(emitCall[1]).toBeInstanceOf(TenantFailedEvent);
        expect(emitCall[1].payload.error).toBe('DB Error');
    });

    it('should validate subdomain availability', async () => {
        // Taken
        mockPool.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
        try {
            await service.validateSubdomain('taken');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.getStatus()).toBe(400);
            expect(e.message).toContain('already taken');
        }

        // Available
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        const result = await service.validateSubdomain('fresh');
        expect(result).toBe(true);
    });

    it('should validate subdomain format', async () => {
        try {
            await service.validateSubdomain('Invalid_Name');
            expect(true).toBe(false);
        } catch (e) {
            expect(e.getStatus()).toBe(400);
            expect(e.message).toContain('Invalid subdomain format');
        }
    });

    // Coverage for TenantFailedEvent constructor
    it('should instantiate TenantFailedEvent', () => {
        const event = new TenantFailedEvent({
            subdomain: 'test',
            error: 'fail',
            duration: 100
        });
        expect(event.payload.subdomain).toBe('test');
        expect(event.payload.error).toBe('fail');
    });
});
