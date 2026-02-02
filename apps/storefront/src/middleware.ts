import { NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

export function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const host = req.headers.get('host');

    if (!host) {
        return NextResponse.next();
    }

    // Handle both duckdns.org and localhost
    let subdomain = '';
    const parts = host.split('.');

    if (parts.length >= 3) {
        // subdomain.apex-v2.duckdns.org
        subdomain = parts[0];
    } else if (host.includes('localhost') && parts.length >= 2) {
        // subdomain.localhost
        subdomain = parts[0];
    }

    // Skip rewriting for internal/reserved subdomains
    if (!subdomain || ['api', 'www', 'storefront', 'apex-v2', 'localhost'].includes(subdomain.toLowerCase())) {
        return NextResponse.next();
    }

    // 🛡️ Phase 10: Protect Admin Routes
    if (url.pathname.includes('/admin')) {
        const token = req.cookies.get('apex_admin_token');
        if (!token) {
            const loginUrl = new URL('/login', req.url);
            // Optional: Store returnUrl for better UX
            // loginUrl.searchParams.set('returnUrl', url.pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Rewrite if not already rewritten
    if (!url.pathname.startsWith(`/${subdomain}`)) {
        url.pathname = `/${subdomain}${url.pathname}`;
        console.log(`Rewriting ${host}${req.nextUrl.pathname} -> ${url.pathname}`);
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}
