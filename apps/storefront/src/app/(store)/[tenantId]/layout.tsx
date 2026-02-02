import { API_URL } from '@/config';

async function getStoreStatus(tenantId: string) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    try {
        const res = await fetch(`${backendUrl}/storefront/home`, {
            headers: {
                'Host': `${tenantId}.apex-v2.duckdns.org`,
                'X-Tenant-Subdomain': tenantId,
            },
            next: { revalidate: 60 } // Check status every minute
        });

        if (res.status === 403) {
            const error = await res.json();
            return { suspended: true, message: error.message };
        }

        if (!res.ok) return { error: true };

        const data = await res.json();
        return { suspended: false, tenant: data.tenant };
    } catch (err) {
        return { error: true };
    }
}

export default async function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantId: string };
}) {
    const status = await getStoreStatus(params.tenantId);

    if (status.suspended) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                    <div className="text-6xl mb-6">🔒</div>
                    <h1 className="text-2xl font-black mb-4">Store Temporarily Restricted</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        {status.message || "This store has been suspended by the administration or is currently undergoing maintenance."}
                    </p>
                    <div className="pt-6 border-t border-white/10">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                            Apex V2 Security Protocol (ARCH-S2.5)
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (status.error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-xl font-bold">Store Unavailable</h1>
                    <p className="text-slate-400">Please try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tenant-layout" data-tenant={params.tenantId}>
            {children}
        </div>
    );
}
