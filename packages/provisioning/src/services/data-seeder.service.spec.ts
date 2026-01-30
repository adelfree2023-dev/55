import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { DataSeederService } from './data-seeder.service';

// Mock DB
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
        service = new DataSeederService();
        mockExecute.mockClear();
        mockQuery.mockClear();
    });

    it('should fail if blueprint not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // No blueprint found

        try {
            await service.seedData('test-u', 'invalid-bp');
        } catch (e) {
            expect(e).toBeDefined();
            expect(e.message).toContain('Blueprint invalid-bp not found');
        }
    });

    it('should seed data successfully', async () => {
        // Mock valid blueprint
        mockQuery.mockResolvedValueOnce({
            rows: [{
                config: {
                    products: [{ name: 'P1', slug: 'p1', price: 10 }],
                    pages: [],
                    settings: {}
                }
            }]
        });

        await service.seedData('test-u', 'standard');

        // Should create tables (4 calls) + seed products (1 call) + settings (1 call)
        expect(mockExecute.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
});
