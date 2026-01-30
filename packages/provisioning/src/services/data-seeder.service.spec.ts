import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Define mocks
const mockExecute = mock(() => Promise.resolve());
const mockQuery = mock(() => Promise.resolve({ rows: [] }));

// Mock drizzle-orm
const fakeSql: any = (strings: any, ...values: any[]) => ({ text: strings[0], values, isFake: true });
fakeSql.raw = (str: string) => ({ text: str, isRaw: true });

mock.module('drizzle-orm', () => ({
    sql: fakeSql
}));

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

        expect(mockExecute).toHaveBeenCalled();

        // Collect all sql texts from our fakeSql objects
        const calls = mockExecute.mock.calls.map(c => {
            if (c[0]?.isRaw || c[0]?.isFake) return c[0].text;
            return c[0]; // fallback
        });

        const combined = calls.join(' ');
        expect(combined).toContain('CREATE TABLE');
        expect(combined).toContain('INSERT INTO');
        expect(combined).toContain('products');
    });

    it('should handle empty blueprint', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ config: {} }] });
        await service.seedData('test-u', 'empty');
        expect(mockExecute).toHaveBeenCalled();
    });
});
