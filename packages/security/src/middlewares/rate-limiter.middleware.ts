import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@apex/redis';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
    private readonly logger = new Logger(RateLimiterMiddleware.name);

    constructor(private readonly redisService: RedisService) { }

    async use(req: any, res: any, next: () => void) {
        try {
            const client = this.redisService.getClient();

            const tenantId = req.tenantId || 'anonymous';
            const tier = req.tenantTier || 'basic';

            const limits: Record<string, number> = { basic: 20, pro: 1000, enterprise: 10000 };
            const limit = limits[tier] || limits.basic;

            // Fastify uses .raw.url or .url, not .path
            const path = req.url || req.raw?.url || 'unknown';
            const key = `rate_limit:${tenantId}:${req.ip}:${path}`;

            this.logger.log(`🚦 Rate limit check: ${key} (Tier: ${tier}, Limit: ${limit})`);
            console.log(`[RATE_LIMIT_DEBUG] Key: ${key}, Tier: ${tier}, Limit: ${limit}`);

            const current = await client.incr(key);

            this.logger.log(`📊 Current count for ${key}: ${current}/${limit}`);
            console.log(`[RATE_LIMIT_DEBUG] Current: ${current}/${limit}`);

            if (current === 1) {
                await client.expire(key, 60);
            }

            // Set headers
            const setHeader = (name: string, value: string) => {
                if (typeof res.setHeader === 'function') res.setHeader(name, value);
                else if (typeof res.header === 'function') res.header(name, value);
            };

            setHeader('X-RateLimit-Limit', limit.toString());
            setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());

            if (current > limit) {
                this.logger.warn(`Rate limit exceeded for ${tenantId} (${req.ip}) on ${path}`);

                throw new HttpException({
                    statusCode: 429,
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.'
                }, 429);
            }

            next();
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Rate limiter error (FAIL CLOSED): ${error}`);

            // ARCH-S6: Fail closed on security infrastructure failure
            throw new HttpException({
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                error: 'Service Unavailable',
                message: 'Security infrastructure currently unavailable. Please try again later.'
            }, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
