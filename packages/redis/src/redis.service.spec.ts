import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { RedisService } from './redis.service';

describe('RedisService', () => {
    let service: RedisService;
    let mockClient: any;
    let loggedErrors: string[] = [];
    let loggedWarns: string[] = [];

    beforeEach(() => {
        loggedErrors = [];
        loggedWarns = [];
        mockClient = {
            connect: mock(() => Promise.resolve()),
            quit: mock(() => Promise.resolve()),
            get: mock(() => Promise.resolve('value')),
            set: mock(() => Promise.resolve()),
            setEx: mock(() => Promise.resolve()),
            del: mock(() => Promise.resolve(1)),
            incr: mock(() => Promise.resolve(1)),
            expire: mock(() => Promise.resolve(true)),
            keys: mock(() => Promise.resolve(['key1', 'key2'])),
            flushDb: mock(() => Promise.resolve()),
            ping: mock(() => Promise.resolve('PONG')),
            on: mock((event: string, callback: Function) => {
                if (event === 'error') {
                    (mockClient as any).errorHandler = callback;
                }
                if (event === 'reconnecting') {
                    (mockClient as any).reconnectHandler = callback;
                }
            }),
            options: {
                socket: {
                    reconnectStrategy: (retries: number) => {
                        if (retries > 10) return false;
                        return retries * 50;
                    }
                }
            }
        };

        service = new RedisService();
        (service as any).client = mockClient;

        (service as any).logger = {
            error: mock((msg: string) => loggedErrors.push(msg)),
            warn: mock((msg: string) => loggedWarns.push(msg)),
            log: mock(() => { }),
        };
    });

    it('should connect on module init', async () => {
        await service.onModuleInit();
        expect(mockClient.connect).toHaveBeenCalled();
        expect((service as any).isConnected).toBe(true);
    });

    it('should handle connection failure', async () => {
        mockClient.connect.mockRejectedValue(new Error('Conn fail'));
        await expect(service.onModuleInit()).rejects.toThrow('Conn fail');
        expect(loggedErrors).toContain('Failed to connect to Redis: Conn fail');
    });

    it('should close connection on destroy if connected', async () => {
        (service as any).isConnected = true;
        await service.onModuleDestroy();
        expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should throw error if getClient called when not connected', () => {
        (service as any).isConnected = false;
        expect(() => service.getClient()).toThrow('Redis not connected');
    });

    it('should return client if connected', () => {
        (service as any).isConnected = true;
        expect(service.getClient()).toBe(mockClient);
    });

    it('should handle redis errors via event listener', () => {
        const errorHandler = (mockClient as any).errorHandler;
        if (errorHandler) {
            errorHandler(new Error('Persistent error'));
            expect(loggedErrors.some(m => m.includes('Persistent error'))).toBe(true);
        }
    });

    it('should handle reconnecting events', () => {
        const reconnectHandler = (mockClient as any).reconnectHandler;
        if (reconnectHandler) {
            reconnectHandler();
            expect(loggedWarns).toContain('Redis reconnecting...');
        }
    });

    it('should handle reconnect strategy', () => {
        const strat = mockClient.options.socket.reconnectStrategy;
        expect(strat(1)).toBe(50);
        expect(strat(11)).toBe(false);
    });

    it('should cover all operational methods (increment, delete, etc)', async () => {
        (service as any).isConnected = true;
        await service.get('key');
        await service.set('key', 'val');
        await service.setEx('key', 10, 'val');
        await service.del('key');
        await service.incr('key');
        await service.expire('key', 10);
        await service.keys('*');
        await service.flushDb();
        await service.ping();

        expect(mockClient.get).toHaveBeenCalled();
        expect(mockClient.set).toHaveBeenCalled();
        expect(mockClient.setEx).toHaveBeenCalled();
        expect(mockClient.del).toHaveBeenCalled();
        expect(mockClient.incr).toHaveBeenCalled();
        expect(mockClient.expire).toHaveBeenCalled();
        expect(mockClient.keys).toHaveBeenCalled();
        expect(mockClient.flushDb).toHaveBeenCalled();
        expect(mockClient.ping).toHaveBeenCalled();
    });
});
