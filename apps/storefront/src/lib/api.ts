import { HomePageData } from '@/types/storefront';

const BACKEND_URL = process.env.BACKEND_URL || 'http://apex-api:3000';

export async function getHomePageData(tenantId: string): Promise<HomePageData | null> {
    if (tenantId === 'favicon.ico' || tenantId === 'api' || tenantId === 'www') return null;

    const response = await fetch(`${BACKEND_URL}/storefront/${tenantId}/home`, {
        headers: {
            'X-Tenant-Id': tenantId,
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
            'X-Tenant-Id': tenantId,
        },
    });
}
