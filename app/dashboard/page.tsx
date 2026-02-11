'use client';

import { Search, MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

// Mock Data for Universities
const universities = [
    {
        id: 1,
        name: 'American University of the Middle East',
        location: 'Egaila, Kuwait',
        image: '/download.jpg',
        logo: '/download.jpg',
        available: true,
    },
    // Add more here if needed
];

export default function DashboardPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUniversities = universities.filter(uni =>
        uni.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header / Search */}
            <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">University List</h1>
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search University Name..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* University Cards */}
            <div className="grid gap-6">
                {filteredUniversities.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No universities found matching your search.
                    </div>
                ) : (
                    filteredUniversities.map((uni) => (
                        <div key={uni.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                            {/* Image Section */}
                            <div className="relative h-48 md:h-64 bg-slate-200 overflow-hidden">
                                {/* Placeholder for Image if not exists */}
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-white">
                                    <span className="text-4xl font-bold opacity-20">AUM</span>
                                </div>

                                {/* If user adds image later */}
                                <Image
                                    src={uni.image}
                                    alt={uni.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <h2 className="text-xl md:text-2xl font-bold mb-1">{uni.name}</h2>
                                    <p className="text-sm text-white/80 flex items-center gap-1">
                                        <MapPin size={14} />
                                        {uni.location}
                                    </p>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-4 md:p-6 flex items-center justify-end">
                                <Link
                                    href="/dashboard/map"
                                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-200"
                                >
                                    <span>View Parking</span>
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Ad Space (Similar to screenshot) */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800">Ads Space For Rental</h3>
                    <p className="text-sm text-slate-500">Please contact us.</p>
                </div>
                <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold shadow-sm">
                    Contact
                </button>
            </div>
        </div>
    );
}
