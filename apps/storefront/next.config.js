/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['localhost', 'minio', 'apex-minio', '34.102.116.215'],
    },
    experimental: {
        optimizePackageImports: ['@apex/ui'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL || 'http://apex-api:3000',
    },
};

module.exports = nextConfig;
