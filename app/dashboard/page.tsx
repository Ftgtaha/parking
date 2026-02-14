'use client';

import { Search, MapPin, ArrowRight, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Mock Data for Universities
const universities = [
    {
        id: 1,
        name: 'American University of the Middle East',
        location: 'Egaila, Kuwait',
        image: '/download.jpg', // Ensure this image exists or use a placeholder
        logo: '/download.jpg',
        available: true,
    },
    // Add more here if needed
];

export default function DashboardPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [totalSpots, setTotalSpots] = useState(0);

    const filteredUniversities = universities.filter(uni =>
        uni.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const fetchStats = async () => {
            const { count, error } = await supabase
                .from('spots')
                .select('*', { count: 'exact', head: true });

            if (!error && count !== null) {
                setTotalSpots(count);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-8 pb-10">
            {/* Hero Section */}
            <div className="relative py-10 md:py-16 px-4 md:px-0 text-center space-y-6">
                {/* Decorative Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] md:w-[120%] h-[300px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-3xl -z-10 rounded-full animate-pulse" />

                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    Where do you want to <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">park today?</span>
                </h1>

                <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                    Find the perfect spot at your campus, office, or favorite destination. Real-time availability, secure booking, and zero hassle.
                </p>

                {/* Search Bar - Glassmorphism */}
                <div className="relative max-w-xl mx-auto group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex items-center bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl p-2 shadow-2xl">
                        <Search className="ml-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
                        <input
                            type="text"
                            placeholder="Search for your destination..."
                            className="w-full px-4 py-3 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-lg font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* University Cards Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredUniversities.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">No locations found</h3>
                        <p className="text-slate-500 mt-2">Try searching for something else.</p>
                    </div>
                ) : (
                    filteredUniversities.map((uni) => (
                        <div key={uni.id} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 border border-slate-100/50">
                            {/* Image Header */}
                            <div className="relative h-64 overflow-hidden">
                                <Image
                                    src={uni.image}
                                    alt={uni.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

                                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                                    LIVE
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold leading-tight mb-1">{uni.name}</h2>
                                            <p className="text-slate-300 text-sm flex items-center gap-1.5 font-medium">
                                                <MapPin size={14} className="text-blue-400" />
                                                {uni.location}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content & Stats */}
                            <div className="p-6 pt-4 space-y-6">
                                <div className="flex items-center justify-between text-sm">
                                    {/* Rating Removed as per request */}
                                    <div className="text-slate-500 font-medium w-full text-right">
                                        <span className="text-slate-900 font-bold text-lg">{totalSpots}</span> Total Active Spots
                                    </div>
                                </div>

                                <Link
                                    href="/dashboard/map"
                                    className="relative flex items-center justify-center w-full gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 group-hover:-translate-y-1 shadow-xl shadow-slate-200 group-hover:shadow-blue-500/30 overflow-hidden"
                                >
                                    <span className="relative z-10">View Parking Map</span>
                                    <ArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" size={20} />

                                    {/* Reveal Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Premium Promo Section */}
            <div className="mt-16 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
                    <div className="space-y-4 max-w-xl text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-widest uppercase mb-2">
                            Premium Partnership
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black leading-tight">
                            Want to list your parking space?
                        </h3>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Join thousands of space owners earning passive income. Our platform handles everything from booking to payment security.
                        </p>
                    </div>

                    <div className="flex-shrink-0">
                        <button className="group relative px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg overflow-hidden transition-transform active:scale-95 shadow-lg hover:shadow-white/20">
                            <span className="relative z-10 flex items-center gap-2 group-hover:gap-3 transition-all">
                                Partner With Us
                                <ExternalLink size={18} />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
