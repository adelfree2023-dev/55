'use client';

import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

interface Tenant {
    id: string;
    subdomain: string;
    name: string;
    owner_email: string;
    status: 'active' | 'suspended' | 'deleted';
    plan_id: string;
    created_at: string;
    deleted_at: string | null;
}

export default function SuperAdminPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTenants = async () => {
        if (!API_URL) {
            setError('Configuration error: API URL is missing.');
            setLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_URL}/super-admin/tenants`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to fetch tenants');
            setTenants(data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleDelete = async (id: string, subdomain: string) => {
        if (!confirm(`Are you sure you want to suspend/stop ${subdomain}? Access will be blocked immediately.`)) return;

        try {
            const response = await fetch(`${API_URL}/super-admin/tenants/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Deletion failed');
            }

            // REFRESH INSTEAD OF FILTER: Show the suspended state
            await fetchTenants();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/super-admin/tenants/${id}/restore`, {
                method: 'PATCH',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Restoration failed');
            }

            await fetchTenants();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const calculateDaysRemaining = (deletedAt: string | null) => {
        if (!deletedAt) return null;
        const deletionDate = new Date(deletedAt);
        const expiryDate = new Date(deletionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">A</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">Apex <span className="text-indigo-600">SuperAdmin</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Global Control Panel
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-10 flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Tenant Ecosystem</h2>
                        <p className="text-slate-500">Manage, monitor, and maintain all multitenant instances from a single pane of glass.</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm text-slate-400 mb-1">Total Stores</span>
                        <span className="text-4xl font-black text-indigo-600">{tenants.length}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-slate-200 rounded-2xl border border-slate-300" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl text-center">
                        <p className="font-bold">Operational Failure</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {tenants.map((tenant) => {
                            const daysLeft = calculateDaysRemaining(tenant.deleted_at);
                            const isDeleted = tenant.status === 'deleted';

                            return (
                                <div key={tenant.id} className={`group bg-white border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden ${isDeleted ? 'border-red-200 bg-red-50/30 grayscale-[0.5]' : 'border-slate-200 hover:border-indigo-200'
                                    }`}>
                                    {/* Subtle background accent */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-10 group-hover:bg-indigo-50 transition-colors" />

                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{tenant.name}</h3>
                                            <p className="text-sm text-indigo-600 font-mono tracking-tight">apex-v2.duckdns.org/{tenant.subdomain}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                                                tenant.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {tenant.status === 'active' ? 'نشط (Active)' :
                                                    tenant.status === 'suspended' ? 'موقوف (Suspended)' :
                                                        'معلق للحذف (Pending Deletion)'}
                                            </span>
                                            {isDeleted && daysLeft !== null && (
                                                <span className="text-[10px] font-bold text-red-600 animate-pulse bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                    سيتم المسح النهائي خلال {daysLeft} يوم
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center text-sm text-slate-500">
                                            <svg className="w-4 h-4 mr-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            <span className="truncate">{tenant.owner_email}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500">
                                            <svg className="w-4 h-4 mr-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span>Joined {new Date(tenant.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Plan Level</span>
                                            <span className="text-sm font-bold text-slate-700 capitalize">{tenant.plan_id}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {!isDeleted ? (
                                            <>
                                                <a
                                                    href={`https://apex-v2.duckdns.org/${tenant.subdomain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl text-center hover:bg-slate-200 transition-colors"
                                                >
                                                    زيارة المتجر
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(tenant.id, tenant.subdomain)}
                                                    className="w-12 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-sm"
                                                    title="Stop/Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(tenant.id)}
                                                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl text-center hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                            >
                                                استرجاع المتجر (Restore)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
