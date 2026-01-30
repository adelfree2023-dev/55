import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Define mocks BEFORE importing the service
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
    let DataSeederService: any;
    let service: any;

    beforeEach(async () => {
        mockExecute.mockClear();
        mockQuery.mockClear();

        const module = await import('./data-seeder.service');
        DataSeederService = module.DataSeederService;
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

        // Check for CREATE TABLE calls and INSERT calls
        expect(mockExecute).toHaveBeenCalled();
        const calls = mockExecute.mock.calls.map(c => c[0].text || c[0].toString());
        const combined = calls.join(' ');

        expect(combined).toContain('CREATE TABLE');
        expect(combined).toContain('INSERT INTO');
    });

    it('should handle empty blueprint', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ config: {} }] });
        await service.seedData('test-u', 'empty');
        expect(mockExecute).toHaveBeenCalled(); // Should still create tables
    });
});
