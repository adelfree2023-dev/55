'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState<{ type: 'tenant' | 'super', subdomain?: string }>({ type: 'super' });
    const router = useRouter();

    useEffect(() => {
        // Detect subdomain
        const host = window.location.hostname;
        const parts = host.split('.');

        // Support for localhost (sub.localhost or localhost)
        if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
            setContext({ type: 'tenant', subdomain: parts[0] });
        } else {
            setContext({ type: 'super' });
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.apex-v2.duckdns.org';

            // Login call (The cookie is set by the backend with HttpOnly)
            const res = await fetch(`${apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    subdomain: context.subdomain
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Redirect based on role and context
            if (data.user.role === 'super-admin') {
                router.push('/super-admin');
            } else {
                router.push(`/${context.subdomain || 'admin'}/admin`);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] p-4 font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-md relative">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold tracking-widest uppercase rounded-full mb-4 border border-blue-500/30">
                            {context.type === 'tenant' ? `Store: ${context.subdomain}` : 'Central Portal'}
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">APEX<span className="text-blue-500">V2</span></h1>
                        <p className="text-gray-400 text-sm">Secure Identity Engine</p>
                    </div>

                    {error && (
                        <div className="p-4 mb-6 text-xs text-red-400 bg-red-500/10 rounded-lg border border-red-500/30 animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>Authorize Access</>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-xs">
                            System Access: Restricted.
                            <span className="block mt-1">
                                {context.type === 'super' ? 'Management Node active.' : 'Internal instance resolution active.'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex justify-center space-x-6">
                    <a href="/register" className="text-gray-500 hover:text-white text-xs transition-colors">Create Instance</a>
                    <span className="text-gray-800">|</span>
                    <a href="/" className="text-gray-500 hover:text-white text-xs transition-colors">Platform Home</a>
                </div>
            </div>
        </div>
    );
}
