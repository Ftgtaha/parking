'use client';

import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MapPin, User, LogOut, X, ShieldCheck, Shield, Map as MapIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define nav items with roles
const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['student', 'admin'] },
    { name: 'Map View', href: '/dashboard/map', icon: MapPin, roles: ['student', 'admin'] },
    { name: 'My Profile', href: '/dashboard/profile', icon: User, roles: ['student', 'admin'] },
    { name: 'Add Zone', href: '/dashboard/admin/add-zone', icon: MapIcon, roles: ['admin'] },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

// Init Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { role, toggleRole } = useUser();

    // Filter items based on role
    const filteredNavItems = navItems.filter(item => item.roles.includes(role));

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div className={clsx(
                "fixed md:relative top-0 left-0 h-full w-64 bg-slate-900 text-white shadow-xl z-50 transition-transform duration-300 transform",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                        EasyParking
                    </h1>
                    {/* Close Button (Mobile Only) */}
                    <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                        {role === 'admin' ? <ShieldCheck size={16} className="text-green-400" /> : <User size={16} className="text-blue-400" />}
                        <span>Role: <span className="font-bold text-slate-200 capitalize">{role}</span></span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onClose()} // Close on mobile click
                                className={twMerge(
                                    clsx(
                                        'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                        isActive
                                            ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    )
                                )}
                            >
                                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-3">
                    {/* Demo Role Switcher */}


                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/login');
                        }}
                        className="flex items-center space-x-3 text-red-400 hover:text-red-300 px-4 py-2 w-full hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
