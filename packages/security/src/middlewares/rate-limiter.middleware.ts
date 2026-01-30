import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
    public static client = createClient({ url: process.env.REDIS_URL });

    static async use(req: any, res: Response, next: NextFunction) {
        if (!RateLimiterMiddleware.client.isOpen) {
            await RateLimiterMiddleware.client.connect();
        }

        const key = `rate_limit:${req.ip}:${req.path}`;
        const current = await RateLimiterMiddleware.client.incr(key);

        if (current === 1) {
            await RateLimiterMiddleware.client.expire(key, 60); // 60 seconds
        }

        if (current > 100) { // 100 requests/minute
            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: 60,
            });
        }

        res.setHeader('X-RateLimit-Limit', '100');
        res.setHeader('X-RateLimit-Remaining', 100 - current);
        res.setHeader('X-RateLimit-Reset', 60);

        next();
    }
}
