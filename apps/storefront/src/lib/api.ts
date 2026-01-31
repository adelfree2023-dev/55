import { HomePageData } from '@/types/storefront';

const BACKEND_URL = process.env.BACKEND_URL || 'http://apex-api:3000';

export async function getHomePageData(tenantId: string): Promise<HomePageData | null> {
    if (tenantId === 'favicon.ico' || tenantId === 'api' || tenantId === 'www') return null;

    // Use Host header for tenant context (internal routing)
    // We treat 'apex-api' as the backend, but we need to spoof the Host header
    // so TenantMiddleware can extract the subdomain.
    const response = await fetch(`${BACKEND_URL}/storefront/${tenantId}/home`, {
        headers: {
            'Host': `${tenantId}.apex.localhost`, // Internal DNS spoofing for validation
        },
        next: { revalidate: 300 }, // ISR: Revalidate every 5 minutes
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch home page data: ${response.status}`);
    }

    return response.json();
}

export async function refreshHomePageCache(tenantId: string): Promise<void> {
    await fetch(`${BACKEND_URL}/storefront/${tenantId}/home/refresh`, {
        method: 'GET',
        headers: {
            'Host': `${tenantId}.apex.localhost`,
        },
    });
}
