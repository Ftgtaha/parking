'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
            {/* Hamburger Button (Mobile Only) */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-4 left-4 z-30 p-2 bg-slate-900 text-white rounded-lg shadow-lg md:hidden hover:bg-slate-700 transition-colors"
                aria-label="Open Menu"
            >
                <Menu size={24} />
            </button>

            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
                <div className="max-w-7xl mx-auto mt-12 md:mt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
