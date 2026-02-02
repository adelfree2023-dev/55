'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '../../config';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        subdomain: '',
        storeName: '',
        ownerEmail: '',
        password: '',
        confirmPassword: '',
        planId: 'basic'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!API_URL) {
            setError('Configuration error: API URL is missing.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/provisioning/tenants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create store');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in duration-500">
                    <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-500/20 text-blue-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4">Check your Inbox</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        We've sent a verification link to <strong className="text-white">{formData.ownerEmail}</strong>.
                        Please verify your email to activate <strong>{formData.storeName}</strong>.
                    </p>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-500 mb-8">
                        Wait for the email (Local: check <a href="http://localhost:8025" target="_blank" className="text-blue-400">Mailpit</a>)
                    </div>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full py-4 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex font-sans antialiased overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-600/20 blur-[120px] rounded-full" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="max-w-xl w-full">
                    <div className="text-center mb-10">
                        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                            Forge your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Digital Realm</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md mx-auto">
                            The next generation of isolated, high-performance commerce.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Store Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700 shadow-inner"
                                        placeholder="Nova Commerce"
                                        value={formData.storeName}
                                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Subdomain</label>
                                    <div className="flex relative">
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                            placeholder="subdomain"
                                            value={formData.subdomain}
                                            onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                                        />
                                        <span className="absolute right-3 top-3.5 text-gray-600 text-[10px] font-mono">
                                            .apex-v2
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Owner Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                    placeholder="founder@apex.com"
                                    value={formData.ownerEmail}
                                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Admin Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Confirm Access</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Select Plan</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['basic', 'pro', 'enterprise'].map((plan) => (
                                        <button
                                            key={plan}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, planId: plan })}
                                            className={`py-2 rounded-lg border transition-all capitalize ${formData.planId === plan
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                                }`}
                                        >
                                            {plan}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Provisioning Infrastructure...
                                    </span>
                                ) : 'Create My Store Now'}
                            </button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-gray-500 text-sm">
                        Already have an account? <span className="text-blue-400 hover:underline cursor-pointer">Super Admin Login</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
