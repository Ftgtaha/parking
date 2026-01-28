'use client';

import Link from 'next/link';
import { Plus, Map } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500">Manage parking zones and settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Add Zone Card */}
                <Link
                    href="/dashboard/admin/add-zone"
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center text-center py-12"
                >
                    <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Add New Zone</h3>
                    <p className="text-slate-500 text-sm">Create and configure new parking zones on the map.</p>
                </Link>

                {/* View Map Card */}
                <Link
                    href="/dashboard/map"
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center text-center py-12"
                >
                    <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <Map size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">View Live Map</h3>
                    <p className="text-slate-500 text-sm">Monitor real-time parking spot availability.</p>
                </Link>
            </div>
        </div>
    );
}
