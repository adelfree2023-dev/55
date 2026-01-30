import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { TenantsService } from './tenants.service';

describe('TenantsService (Super-#01)', () => {
    let service: TenantsService;
    let mockPool: any;

    beforeEach(() => {
        mockPool = {
            query: mock(() => Promise.resolve({ rows: [] })),
        };
        service = new TenantsService();
        (service as any).pool = mockPool;
    });

    it('should fetch all tenants with default pagination', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '5' }] }); // Count
        mockPool.query.mockResolvedValueOnce({
            rows: Array(5).fill(null).map((_, i) => ({
                id: `tenant-${i}`,
                subdomain: `test${i}`,
                status: 'active',
            })),
        });

        const result = await service.findAll({ page: 1, limit: 20 });

        expect(result.data).toHaveLength(5);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.total).toBe(5);
    });

    it('should filter by status', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '2' }] });
        mockPool.query.mockResolvedValueOnce({
            rows: [
                { id: '1', status: 'active' },
                { id: '2', status: 'active' },
            ],
        });

        await service.findAll({ status: 'active', page: 1, limit: 20 });

        expect(mockPool.query.mock.calls[0][0]).toContain('WHERE status = $1');
    });

    it('should filter by plan', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: '1', plan: 'pro' }],
        });

        await service.findAll({ plan: 'pro', page: 1, limit: 20 });

        expect(mockPool.query.mock.calls[0][0]).toContain('plan = $');
    });

    it('should search by subdomain or store name', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: '1', subdomain: 'test-shop', store_name: 'Test Shop' }],
        });

        await service.findAll({ search: 'test', page: 1, limit: 20 });

        expect(mockPool.query.mock.calls[0][0]).toContain('ILIKE');
    });

    it('should handle pagination correctly', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '50' }] });
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await service.findAll({ page: 2, limit: 10 });

        expect(result.pagination.page).toBe(2);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.total).toBe(50);
        expect(result.pagination.totalPages).toBe(5);

        // Check OFFSET calculation
        expect(mockPool.query.mock.calls[1][1]).toContain(10); // OFFSET = (2-1) * 10
    });

    it('should combine multiple filters', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: '1', status: 'active', plan: 'enterprise', subdomain: 'bigcorp' }],
        });

        await service.findAll({
            status: 'active',
            plan: 'enterprise',
            search: 'big',
            page: 1,
            limit: 20,
        });

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain('status = $');
        expect(query).toContain('plan = $');
        expect(query).toContain('ILIKE');
    });

    it('should find tenant by id', async () => {
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: 'test-id', subdomain: 'test', status: 'active' }],
        });

        const result = await service.findOne('test-id');
        expect(result.id).toBe('test-id');
    });

    it('should throw error if tenant not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await expect(service.findOne('nonexistent')).rejects.toThrow('not found');
    });
});
