import React from 'react';

async function getHomePageData(tenantId: string) {
    // SECURITY FIX: Use Host header for tenant context, not URL parameter
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/storefront/home`, {
        headers: {
            'Host': `${tenantId}.apex-v2.duckdns.org`,
            'X-Tenant-Subdomain': tenantId,
        },
        next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    return res.json();
}

export default async function StorefrontPage({
    params
}: {
    params: { tenantId: string }
}) {
    const { tenantId } = params;

    // 🔴 VALIDATE tenantId BEFORE FETCH
    if (!/^[a-z0-9-]+$/.test(tenantId)) {
        return <div className="p-8 text-red-500 font-bold text-center">Invalid store identifier</div>;
    }

    const data = await getHomePageData(tenantId);

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <h1 className="text-3xl font-extrabold text-gray-900">Store Not Found</h1>
                    <p className="mt-4 text-gray-600">The requested store does not exist or is currently inactive.</p>
                </div>
            </div>
        );
    }

    const { tenant, sections } = data;

    return (
        <div className="min-h-screen bg-white">
            {/* Dynamic Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            {tenant.logoUrl ? (
                                <img className="h-8 w-auto" src={tenant.logoUrl} alt={tenant.name} />
                            ) : (
                                <span className="text-2xl font-bold" style={{ color: tenant.primaryColor }}>
                                    {tenant.name}
                                </span>
                            )}
                        </div>
                        <nav className="hidden md:flex space-x-8">
                            <a href="#" className="text-gray-900 font-medium">Shop</a>
                            <a href="#" className="text-gray-500 hover:text-gray-900 font-medium">Categories</a>
                            <a href="#" className="text-gray-500 hover:text-gray-900 font-medium">About</a>
                        </nav>
                        <div className="flex items-center space-x-4">
                            {/* Cart placeholder */}
                            <button className="p-2 text-gray-400 hover:text-gray-500">
                                <span className="sr-only">Cart</span>
                                🛒
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                {sections.hero && sections.hero.length > 0 && (
                    <div className="relative overflow-hidden bg-gray-900">
                        {sections.hero.map((banner: any, idx: number) => (
                            <div key={banner.id} className={idx === 0 ? "block" : "hidden"}>
                                <div className="max-w-7xl mx-auto">
                                    <div className="relative z-10 py-24 sm:py-32 lg:py-48 px-4 sm:px-6 lg:px-8">
                                        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                                            {banner.title}
                                        </h1>
                                        <p className="mt-6 text-xl text-gray-300 max-w-3xl">
                                            {banner.subtitle}
                                        </p>
                                        <div className="mt-10">
                                            <a href={banner.ctaUrl} className="inline-block bg-white border border-transparent rounded-md py-3 px-8 text-base font-medium text-gray-900 hover:bg-gray-100"
                                                style={{ backgroundColor: tenant.primaryColor, color: '#fff' }}>
                                                {banner.ctaText}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                {banner.imageUrl && (
                                    <div className="absolute inset-0 z-0">
                                        <img src={banner.imageUrl} alt="" className="w-full h-full object-center object-cover opacity-60" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Best Sellers */}
                {sections.bestSellers && sections.bestSellers.length > 0 && (
                    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Best Sellers</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {sections.bestSellers.map((product: any) => (
                                <div key={product.id} className="group relative border rounded-xl overflow-hidden hover:shadow-xl transition-shadow">
                                    <div className="aspect-w-1 aspect-h-1 bg-gray-200 group-hover:opacity-75">
                                        <img src={product.imageUrl || '/placeholder-product.png'} alt={product.name} className="w-full h-48 object-center object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm text-gray-700 font-bold">{product.name}</h3>
                                        <p className="mt-1 text-lg font-medium text-gray-900">${product.price}</p>
                                        <button className="mt-4 w-full py-2 rounded-lg text-white font-medium transition-colors"
                                            style={{ backgroundColor: tenant.primaryColor }}>
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="bg-gray-50 border-t py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-gray-500">© {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
                    <p className="mt-2 text-sm text-gray-400">
                        Powered by Apex V2 •
                        <a href={`/${tenantId}/admin`} className="ml-1 hover:text-gray-600 transition-colors underline decoration-gray-300">
                            Manage Store
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
