"use client";

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-4xl w-full text-center mb-16">
                <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-sm font-medium tracking-wide">
                    Next-Gen Multi-tenant E-commerce
                </div>
                <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-8">
                    Apex <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">V2</span>
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    A powerful, secure, and infinitely scalable platform for managing thousands of unique storefronts from a single core.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
                {/* Registration Card */}
                <Link href="/register" className="group p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-300 backdrop-blur-md">
                    <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Create a Store</h2>
                    <p className="text-slate-400 mb-6">Launch a new white-label e-commerce instance with dedicated database schema in seconds.</p>
                    <span className="text-indigo-400 font-bold flex items-center gap-2">
                        Get Started <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </span>
                </Link>

                {/* Super Admin Card */}
                <Link href="/super-admin" className="group p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-md">
                    <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Super Admin</h2>
                    <p className="text-slate-400 mb-6">Global control panel for system administrators to manage all tenant lifecycles and health.</p>
                    <span className="text-purple-400 font-bold flex items-center gap-2">
                        Enter Command Center <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </span>
                </Link>
            </div>

            <div className="mt-16 text-slate-500 text-sm flex gap-8">
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> API Cluster: Healthy
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" /> Multitenancy: Active
                </span>
            </div>
        </div>
    );
}
