export default function HomePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">
                    Apex V2 Storefront
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                    Navigate to /[tenantId] to view a tenant storefront
                </p>
                <p className="text-sm text-gray-500">
                    Example: <code className="bg-gray-200 px-2 py-1 rounded">/demo-store</code>
                </p>
            </div>
        </div>
    );
}
