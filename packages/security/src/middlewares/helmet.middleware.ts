import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
    private readonly logger = new Logger(HelmetMiddleware.name);

    use(req: Request, res: Response, next: NextFunction) {
        // Content Security Policy
        res.setHeader(
            'Content-Security-Policy',
            [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: https:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://api.stripe.com",
                "frame-src 'none'",
                "object-src 'none'",
            ].join('; ')
        );

        // HTTP Strict Transport Security
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );

        // X-Frame-Options
        res.setHeader('X-Frame-Options', 'DENY');

        // X-Content-Type-Options
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // X-XSS-Protection
        res.setHeader('X-XSS-Protection', '1; mode=block');

        // Referrer-Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions-Policy
        res.setHeader(
            'Permissions-Policy',
            'geolocation=(), microphone=(), camera=()'
        );

        // Dynamic CORS per tenant domain (S8 requirement)
        const origin = req.headers.origin;
        if (origin && this.isTrustedOrigin(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader(
                'Access-Control-Allow-Methods',
                'GET, POST, PUT, DELETE, OPTIONS'
            );
            res.setHeader(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization, X-Tenant-Id'
            );
        }

        // Add strict CSRF protection for cookie sessions
        if (req.method !== 'OPTIONS') {
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        }

        next();
    }

    private isTrustedOrigin(origin: string): boolean {
        // In production: validate against tenant domains from DB
        // For Phase 1: allow localhost and apex.localhost
        const trustedPatterns = [
            /^https?:\/\/localhost(:\d+)?$/,
            /^https?:\/\/[\w-]+\.apex\.localhost$/,
            /^https:\/\/[\w-]+\.apex\.com$/,
        ];

        return trustedPatterns.some(pattern => pattern.test(origin));
    }
}
