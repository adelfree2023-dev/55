export const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window !== 'undefined') {
    console.error("🚨 CRITICAL: NEXT_PUBLIC_API_URL is missing! Check your .env file or Docker environment.");
}

export const getApiUrl = () => {
    if (!API_URL) {
        // In server-side rendering or build time, it might be missing depending on CI/CD
        // but we strictly forbid silent fallbacks to production in the client.
        return '';
    }
    return API_URL;
};
