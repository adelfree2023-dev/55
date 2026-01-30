import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { DataSeederService } from './data-seeder.service';

describe('DataSeederService', () => {
    let service: DataSeederService;
    let mockPool: any;
    let mockDb: any;

    beforeEach(() => {
        mockPool = {
            query: mock(() => Promise.resolve({ rows: [] }))
        };

        mockDb = {
            execute: mock(() => Promise.resolve())
        };

        service = new DataSeederService(mockPool, mockDb);
    });

    it('should fail if blueprint not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

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
        mockPool.query.mockResolvedValueOnce({
            rows: [{
                config: {
                    products: [{ name: 'P1', slug: 'p1', price: 10 }],
                    pages: [{ title: 'Home', slug: 'home' }],
                    settings: { theme: 'dark' }
                }
            }]
        });

        await service.seedData('test-u', 'standard');

        expect(mockDb.execute).toHaveBeenCalled();

        // Verify we are making calls
        const calls = mockDb.execute.mock.calls;
        const callTexts = calls.map((c: any) => typeof c[0] === 'string' ? c[0] : JSON.stringify(c[0]));
        const combined = callTexts.join(' ');

        expect(combined).toContain('products');
        expect(combined).toContain('pages');
    });
});
