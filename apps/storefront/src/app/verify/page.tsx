'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your account...');
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Missing verification token.');
            return;
        }

        const verify = async () => {
            try {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.apex-v2.duckdns.org';
                const res = await fetch(`${apiBaseUrl}/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    setMessage('Account activated successfully! You can now log in.');
                    setTimeout(() => router.push('/login'), 3000);
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Connection error. Please try again later.');
            }
        };

        verify();
    }, [token, router]);

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
            {status === 'loading' && (
                <div className="space-y-6">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Authenticating...</h2>
                    <p className="text-gray-400">{message}</p>
                </div>
            )}

            {status === 'success' && (
                <div className="space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Access Granted</h2>
                    <p className="text-gray-400">{message}</p>
                    <p className="text-xs text-blue-400">Redirecting to login portal...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 text-red-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Link Invalid</h2>
                    <p className="text-red-400">{message}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full py-3 px-6 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-bold"
                    >
                        Return to Portal
                    </button>
                </div>
            )}
        </div>
    );
}

export default function VerifyPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] p-4 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}
