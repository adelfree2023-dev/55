import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

// Mock dependencies using Bun's mock.module
mock.module('pg', () => {
    return {
        Pool: mock(() => ({
            query: mock(() => Promise.resolve({ rows: [] })),
            connect: mock(() => Promise.resolve({
                query: mock(),
                release: mock()
            })),
            on: mock(),
            end: mock(),
        })),
    };
});

mock.module('@apex/db', () => ({
    setSchemaPath: mock(),
}));

describe('TenantMiddleware', () => {
    let middleware: any;
    let mockPoolInstance: any;

    beforeEach(async () => {
        // Clear mocks
        mock.restore();

        // Import module under test
        // Note: For NestJS Test.createTestingModule to work with Bun mocks,
        // we might encounter issues if providers are not properly overriden.
        // However, we are mocking the *imports* used by the middleware file.
        // But the middleware uses @Inject('BoundPool').

        const middlewareModule = require('./tenant.middleware');

        // We can manually instantiate if NestJS testing module is too heavy/complex for Bun mocks
        // But let's try to keep the structure.

        // Define mock pool for the provider
        const mockBoundPool = {
            connect: mock(),
            query: mock(),
            on: mock(),
            end: mock(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                middlewareModule.TenantMiddleware,
                {
                    provide: 'BoundPool',
                    useValue: mockBoundPool,
                }
            ],
        }).compile();

        middleware = module.get(middlewareModule.TenantMiddleware);
        mockPoolInstance = (middleware as any).pool;

        // Setup default behaviors
        mockPoolInstance.connect.mockResolvedValue({
            query: mock(),
            release: mock(),
        });
        mockPoolInstance.query.mockResolvedValue({ rows: [] });

        // Mock logger
        (middleware as any).logger = {
            error: mock(),
            log: mock(),
            warn: mock()
        };
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    it('should throw ForbiddenException if host is invalid', async () => {
        const req: any = { headers: {} };
        const res: any = { on: mock() };
        const next = mock();

        await expect(middleware.use(req, res, next)).rejects.toThrow();
    });

    it('should set schema path and call next if tenant is found', async () => {
        const req: any = {
            headers: { 'host': 'test-tenant.apex.localhost' },
            ip: '127.0.0.1'
        };
        const res: any = { on: mock() };
        const next = mock();

        // Mock connect client
        const mockClient = {
            query: mock(),
            release: mock(),
        };
        mockPoolInstance.connect.mockResolvedValue(mockClient);

        // Mock tenant lookup
        mockPoolInstance.query.mockResolvedValueOnce({
            rows: [{ id: 'uuid-123', plan_id: 'pro' }],
        });

        await middleware.use(req, res, next);

        // 1. Lookup (pool.query)
        expect(mockPoolInstance.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT id, plan_id FROM public.tenants'),
            ['test-tenant']
        );

        // 2. SET SEARCH_PATH (client.query)
        expect(mockClient.query).toHaveBeenCalledWith(
            'SET search_path TO "tenant_uuid-123", public'
        );

        expect(next).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if tenant is not found', async () => {
        const req: any = { headers: { 'host': 'non-existent.apex.localhost' } };
        const res: any = {};
        const next = mock();

        mockPoolInstance.query.mockResolvedValueOnce({ rows: [] });

        await expect(middleware.use(req, res, next)).rejects.toThrow();
    });

    it('should log error if resetting search_path fails', async () => {
        const req: any = {
            headers: { 'host': 'test-tenant.apex.localhost' },
            ip: '127.0.0.1'
        };

        let finishCallback: any;
        const res: any = {
            on: mock((event: string, cb: any) => {
                if (event === 'finish') finishCallback = cb;
            })
        };
        const next = mock();

        const mockClient = {
            query: mock(),
            release: mock(),
        };
        mockPoolInstance.connect.mockResolvedValue(mockClient);

        // Tenant lookup success
        mockPoolInstance.query.mockResolvedValueOnce({
            rows: [{ id: 'uuid-123', plan_id: 'pro' }],
        });

        // 1. SET SEARCH_PATH success
        mockClient.query.mockResolvedValueOnce(undefined);
        // 2. RESET SEARCH_PATH fails
        mockClient.query.mockRejectedValueOnce(new Error('Reset DB Error'));

        await middleware.use(req, res, next);

        expect(finishCallback).toBeDefined();
        await finishCallback(); // Trigger finish

        // Just wait a tick
        await new Promise(r => setTimeout(r, 1));

        expect((middleware as any).logger.error).toHaveBeenCalled();
        // Check message content roughly or just that it was called
        const errorCall = (middleware as any).logger.error.mock.calls[0];
        expect(errorCall?.[0]).toContain('Reset failed');
        expect(mockClient.release).toHaveBeenCalled();
    });
});
