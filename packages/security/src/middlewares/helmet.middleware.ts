import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class HelmetMiddleware implements NestMiddleware {
    private readonly logger = new Logger(HelmetMiddleware.name);

    use(req: any, res: any, next: () => void) {
        // Generate a random nonce for scripts
        const nonce = require('crypto').randomBytes(16).toString('base64');
        res.locals = res.locals || {};
        res.locals.nonce = nonce;

        this.logger.debug(`Applying Helmet headers. Nonce: ${nonce.substring(0, 5)}...`);

        // Content Security Policy (ARCH-S8 Fix)
        const setHeader = (key: string, value: string) => {
            if (res.setHeader) res.setHeader(key, value);
            else if (res.header) res.header(key, value);
        };

        setHeader(
            'Content-Security-Policy',
            [
                "default-src 'self'",
                `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://api.stripe.com https://*.apex-v2.duckdns.org",
                "frame-src 'none'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "upgrade-insecure-requests"
            ].join('; ')
        );

        // HTTP Strict Transport Security
        setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
        );

        // X-Frame-Options
        setHeader('X-Frame-Options', 'DENY');

        // X-Content-Type-Options
        setHeader('X-Content-Type-Options', 'nosniff');

        // X-XSS-Protection
        setHeader('X-XSS-Protection', '1; mode=block');

        // Referrer-Policy
        setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions-Policy
        setHeader(
            'Permissions-Policy',
            'geolocation=(), microphone=(), camera=()'
        );

        // Dynamic CORS per tenant domain (S8 requirement)
        const origin = req.headers.origin;
        if (origin && this.isTrustedOrigin(origin)) {
            setHeader('Access-Control-Allow-Origin', origin);
            setHeader('Access-Control-Allow-Credentials', 'true');
            setHeader(
                'Access-Control-Allow-Methods',
                'GET, POST, PUT, DELETE, OPTIONS'
            );
            setHeader(
                'Access-Control-Allow-Headers',
                'Content-Type, Authorization, X-Tenant-Id'
            );
        }

        // Add strict CSRF protection for cookie sessions
        if (req.method !== 'OPTIONS') {
            setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
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
