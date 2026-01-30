import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Apex V2 Storefront',
    description: 'Multi-tenant e-commerce storefront',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
