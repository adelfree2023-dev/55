import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware } from './tenant.middleware';
import { Pool } from 'pg';

describe('TenantMiddleware', () => {
    let middleware: TenantMiddleware;
    let mockPool: any; // The global pool (TenantMiddleware.pool) - maybe unused if injected?
    let mockBoundPool: any; // Reduced scope pool

    beforeEach(async () => {
        // Mock the injected class directly

        mockBoundPool = {
            connect: mock(), // For request-scoped connections
            query: mock(),   // For tenant lookup
            on: mock(),
            end: mock(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantMiddleware,
                // Provide the Pool token if it is injected as 'BoundPool' or Pool class
                {
                    provide: 'BoundPool',
                    useValue: mockBoundPool,
                },
                // Also provide Pool class just in case it's injected by type
                {
                    provide: Pool,
                    useValue: mockBoundPool,
                }
            ],
        }).compile();

        middleware = module.get<TenantMiddleware>(TenantMiddleware);

        // Ensure logger is mocked
        (middleware as any).logger = {
            error: mock(),
            log: mock(),
            warn: mock()
        };
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    it('should set schema path and call next if tenant exists', async () => {
        const req: any = {
            headers: { 'host': 'test-tenant.apex.localhost' },
            ip: '127.0.0.1'
        };
        const res: any = { on: mock() };
        const next = mock();

        // 1. Mock connection for SET search_path
        const mockClient = {
            query: mock(),
            release: mock(),
        };
        mockBoundPool.connect.mockResolvedValue(mockClient);

        // 2. Mock tenant lookup
        mockBoundPool.query.mockResolvedValueOnce({
            rows: [{ id: 'uuid-123', plan_id: 'pro', status: 'active' }],
        });

        await middleware.use(req, res, next);

        // Check search path was set
        expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('SET search_path'));
        expect(next).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if tenant is not found', async () => {
        const req: any = { headers: { 'host': 'non-existent.apex.localhost' } };
        const res: any = { on: mock() }; // Add on listener mock to avoid crash if middleware tries to attach it
        const next = mock();

        mockBoundPool.query.mockResolvedValueOnce({ rows: [] });

        try {
            await middleware.use(req, res, next);
            expect(true).toBe(false);
        } catch (e: any) {
            expect(e.message).toBe('Invalid tenant context');
        }
    });
});
