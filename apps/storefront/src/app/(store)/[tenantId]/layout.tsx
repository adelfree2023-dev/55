export default function TenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { tenantId: string };
}) {
    return (
        <div className="tenant-layout" data-tenant={params.tenantId}>
            {children}
        </div>
    );
}
