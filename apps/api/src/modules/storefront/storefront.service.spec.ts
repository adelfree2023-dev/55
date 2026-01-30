import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { StorefrontService } from './storefront.service';
import { CacheService } from '@apex/cache';
import { NotFoundException } from '@nestjs/common';

describe('StorefrontService', () => {
    let service: StorefrontService;
    let cacheService: CacheService;
    let mockPool: any;

    beforeEach(() => {
        // Mock CacheService
        cacheService = {
            get: mock(() => Promise.resolve(null)),
            set: mock(() => Promise.resolve()),
            del: mock(() => Promise.resolve(1)),
        } as any;

        // Mock PostgreSQL Pool
        mockPool = {
            query: mock((sql: string) => {
                if (sql.includes('public.tenants')) {
                    return Promise.resolve({
                        rows: [{
                            id: 'tenant-123',
                            name: 'Test Store',
                            subdomain: 'test-store',
                            logo_url: 'https://example.com/logo.png',
                            primary_color: '#FF5733',
                        }]
                    });
                }
                // Return empty arrays for section queries
                return Promise.resolve({ rows: [] });
            }),
        };

        service = new StorefrontService(cacheService);
        (service as any).pool = mockPool;
    });

    it('should return cached data if available', async () => {
        const cachedData = {
            tenant: { id: 'tenant-123', name: 'Test Store' },
            sections: {},
            metadata: {}
        };

        cacheService.get = mock(() => Promise.resolve(cachedData));

        const result = await service.getHomePage('test-store');

        expect(result).toEqual(cachedData);
        expect(cacheService.get).toHaveBeenCalledWith('storefront:home:test-store');
    });

    it('should fetch from database on cache miss', async () => {
        const result = await service.getHomePage('test-store');

        expect(mockPool.query).toHaveBeenCalled();
        expect(result.tenant.name).toBe('Test Store');
        expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent tenant', async () => {
        mockPool.query = mock(() => Promise.resolve({ rows: [] }));

        try {
            await service.getHomePage('non-existent');
            expect(true).toBe(false); // Should not reach here
        } catch (error) {
            expect(error).toBeInstanceOf(NotFoundException);
            expect(error.message).toContain('non-existent');
        }
    });

    it('should invalidate cache', async () => {
        await service.invalidateCache('test-store');

        expect(cacheService.del).toHaveBeenCalledWith('storefront:home:test-store');
    });

    it('should warm cache', async () => {
        // Mock pool to return valid data
        await service.warmCache('test-store');

        expect(mockPool.query).toHaveBeenCalled();
        expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle missing sections gracefully', async () => {
        const result = await service.getHomePage('test-store');

        expect(result.sections.hero).toEqual([]);
        expect(result.sections.bestSellers).toEqual([]);
        expect(result.sections.categories).toEqual([]);
        expect(result.sections.promotions).toEqual([]);
        expect(result.sections.testimonials).toEqual([]);
    });

    it('should include metadata in response', async () => {
        const result = await service.getHomePage('test-store');

        expect(result.metadata).toBeDefined();
        expect(result.metadata.cacheTTL).toBe(300);
        expect(result.metadata.lastUpdated).toBeDefined();
    });
});
