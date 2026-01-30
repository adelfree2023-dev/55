import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { DataSeederService } from './data-seeder.service';

const mockExecute = mock(() => Promise.resolve());
const mockQuery = mock(() => Promise.resolve({ rows: [] }));

mock.module('drizzle-orm/node-postgres', () => ({
    drizzle: () => ({
        execute: mockExecute
    })
}));

mock.module('pg', () => ({
    Pool: class {
        query = mockQuery;
        constructor() { }
    }
}));

describe('DataSeederService', () => {
    let service: DataSeederService;

    beforeEach(() => {
        mockExecute.mockClear();
        mockQuery.mockClear();
        service = new DataSeederService();
    });

    it('should fail if blueprint not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        let error;
        try {
            await service.seedData('test-u', 'invalid-bp');
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
        expect(error.message).toContain('Blueprint invalid-bp not found');
    });

    it('should seed data successfully', async () => {
        // Mock valid blueprint
        mockQuery.mockResolvedValueOnce({
            rows: [{
                config: {
                    products: [{ name: 'P1', slug: 'p1', price: 10 }],
                    pages: [{ title: 'Home', slug: 'home' }],
                    settings: { theme: 'dark' }
                }
            }]
        });

        await service.seedData('test-u', 'standard');

        // Calls expected:
        // 4 calls for Core Tables (Products, Orders, Pages, Settings)
        // 1 call for Seed Products
        // 1 call for Seed Pages
        // 1 call for Seed Settings
        // Total >= 7
        expect(mockExecute.mock.calls.length).toBeGreaterThanOrEqual(7);

        // Verify specific calls
        const calls = mockExecute.mock.calls.map(c => c[0].text || c[0]); // .text for sql`` template literal or string
        const combinedSQL = calls.map(c => typeof c === 'string' ? c : c.toString()).join(' ');

        // Check for table creation
        expect(combinedSQL).toContain('CREATE TABLE IF NOT EXISTS "tenant_test-u".products');

        // Check for seeding
        expect(combinedSQL).toContain('INSERT INTO "tenant_test-u".products');
        expect(combinedSQL).toContain('INSERT INTO "tenant_test-u".pages');
        expect(combinedSQL).toContain('INSERT INTO "tenant_test-u".settings');
    });

    it('should handle empty blueprint sections', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                config: {
                    products: [],
                    pages: [],
                    settings: {}
                }
            }]
        });

        await service.seedData('test-u', 'empty');

        // 4 Core tables created
        expect(mockExecute.mock.calls.length).toBe(4);
    });
});
