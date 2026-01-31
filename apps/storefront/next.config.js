// const { withSentryConfig } = require('@sentry/nextjs');

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

// module.exports = withSentryConfig(
//     nextConfig,
//     {
//         // Sentry webpack plugin options
//         silent: true,
//         org: "apex-platform",
//         project: "apex-platform",
//     },
//     {
//         // Additional config options for automatic instrumentation
//         hideSourceMaps: true,
//         disableLogger: true,
//     }
// );

module.exports = nextConfig;
