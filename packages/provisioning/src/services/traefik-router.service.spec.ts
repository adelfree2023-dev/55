import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { TraefikRouterService } from './traefik-router.service';
import { join } from 'path';

// Mock fs/promises
const mockWriteFile = mock(() => Promise.resolve());
const mockMkdir = mock(() => Promise.resolve());

mock.module('fs/promises', () => ({
    writeFile: mockWriteFile,
    mkdir: mockMkdir
}));

describe('TraefikRouterService', () => {
    let service: TraefikRouterService;

    beforeEach(() => {
        service = new TraefikRouterService();
        mockWriteFile.mockClear();
        mockMkdir.mockClear();
    });

    it('should generate and write yaml config', async () => {
        const subdomain = 'myshop';
        await service.createRoute(subdomain);

        expect(mockMkdir).toHaveBeenCalled();
        expect(mockWriteFile).toHaveBeenCalled();

        const [path, content] = mockWriteFile.mock.lastCall;
        expect(path).toContain(`${subdomain}-route.yml`);
        expect(content).toContain(`Host(\`${subdomain}.apex.localhost\`)`);
        expect(content).toContain('X-Tenant-Id: "myshop"');
    });
});
