"use client";

import React, { useState, useEffect } from 'react';
import { API_URL } from '@/config';

interface TenantInfo {
    id: string;
    name: string;
    subdomain: string;
    logoUrl: string | null;
    primaryColor: string;
}

interface HeroSection {
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    ctaText: string;
    ctaUrl: string;
}

export default function TenantAdminPage({
    params
}: {
    params: { tenantId: string }
}) {
    const { tenantId } = params;
    const [activeTab, setActiveTab] = useState<'branding' | 'hero'>('branding');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form States
    const [brandData, setBrandData] = useState({
        name: '',
        primaryColor: '#6366f1',
        logoUrl: ''
    });

    const [heroData, setHeroData] = useState({
        title: '',
        subtitle: '',
        imageUrl: '',
        ctaText: 'Shop Now',
        ctaUrl: '#'
    });

    useEffect(() => {
        fetchInitialData();
    }, [tenantId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/storefront/home`, {
                headers: { 'X-Tenant-Subdomain': tenantId }
            });
            if (!res.ok) throw new Error('Failed to fetch store data');
            const data = await res.json();

            setBrandData({
                name: data.tenant.name,
                primaryColor: data.tenant.primaryColor || '#6366f1',
                logoUrl: data.tenant.logoUrl || ''
            });

            if (data.sections.hero && data.sections.hero.length > 0) {
                const h = data.sections.hero[0];
                setHeroData({
                    title: h.title,
                    subtitle: h.subtitle || '',
                    imageUrl: h.imageUrl || '',
                    ctaText: h.ctaText,
                    ctaUrl: h.ctaUrl
                });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);
            const res = await fetch(`${API_URL}/storefront/branding`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-Subdomain': tenantId
                },
                body: JSON.stringify(brandData)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update branding');
            }
            setMessage({ type: 'success', text: 'Branding updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHero = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);
            const res = await fetch(`${API_URL}/storefront/hero`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-Subdomain': tenantId
                },
                body: JSON.stringify(heroData)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update hero banner');
            }
            setMessage({ type: 'success', text: 'Hero banner updated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black">Store Management</h1>
                        <p className="text-slate-400">Manage <span className="text-indigo-400 font-bold">{tenantId}</span> instance</p>
                    </div>
                    <div className="flex gap-4">
                        <a href={`/${tenantId}`} target="_blank" className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2">
                            View Store ↗
                        </a>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('branding')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'branding' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Branding
                    </button>
                    <button
                        onClick={() => setActiveTab('hero')}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'hero' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Hero Banner
                    </button>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* Forms */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
                    {activeTab === 'branding' && (
                        <form onSubmit={handleSaveBranding} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">Store Name</label>
                                    <input
                                        type="text"
                                        value={brandData.name}
                                        onChange={e => setBrandData({ ...brandData, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 transition-colors outline-none"
                                        placeholder="Enter store name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">Primary Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={brandData.primaryColor}
                                            onChange={e => setBrandData({ ...brandData, primaryColor: e.target.value })}
                                            className="w-12 h-12 rounded-lg bg-transparent border-none cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={brandData.primaryColor}
                                            onChange={e => setBrandData({ ...brandData, primaryColor: e.target.value })}
                                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 transition-colors outline-none uppercase"
                                            placeholder="#6366F1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Logo URL</label>
                                <input
                                    type="text"
                                    value={brandData.logoUrl}
                                    onChange={e => setBrandData({ ...brandData, logoUrl: e.target.value })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 transition-colors outline-none"
                                    placeholder="https://example.com/logo.png"
                                />
                                <p className="text-xs text-slate-500 italic">Leave empty to use text-based logo</p>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={saving}
                                    type="submit"
                                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {saving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    Save Branding
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'hero' && (
                        <form onSubmit={handleSaveHero} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Banner Title</label>
                                <input
                                    type="text"
                                    value={heroData.title}
                                    onChange={e => setHeroData({ ...heroData, title: e.target.value })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
                                    placeholder="Welcome to our store"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Subtitle</label>
                                <textarea
                                    value={heroData.subtitle}
                                    onChange={e => setHeroData({ ...heroData, subtitle: e.target.value })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none h-24 resize-none"
                                    placeholder="Describe your value proposition..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Banner Image URL</label>
                                <input
                                    type="text"
                                    value={heroData.imageUrl}
                                    onChange={e => setHeroData({ ...heroData, imageUrl: e.target.value })}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
                                    placeholder="https://images.unsplash.com/..."
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">CTA Button Text</label>
                                    <input
                                        type="text"
                                        value={heroData.ctaText}
                                        onChange={e => setHeroData({ ...heroData, ctaText: e.target.value })}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-400">CTA URL</label>
                                    <input
                                        type="text"
                                        value={heroData.ctaUrl}
                                        onChange={e => setHeroData({ ...heroData, ctaUrl: e.target.value })}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={saving}
                                    type="submit"
                                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {saving && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    Update Hero Banner
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Security Disclaimer */}
                <div className="mt-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-start gap-4">
                    <div className="text-2xl">🛡️</div>
                    <div className="text-sm text-slate-500">
                        <strong className="text-slate-300 block mb-1">Security & Access Control</strong>
                        Your session is strictly scoped to this tenant instance. All modifications are tracked and validated via global security protocols (ARCH-S2). Cross-tenant operations are strictly prohibited.
                    </div>
                </div>
            </div>
        </div>
    );
}
