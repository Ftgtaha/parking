'use client';

import { useRealtimeSpots, Spot } from '@/hooks/useRealtimeSpots';
import { clsx } from 'clsx';
import { Loader2, MapPin, Clock, ArrowRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';

export default function DashboardPage() {
    const { spots, loading } = useRealtimeSpots();
    const { userId, role } = useUser();

    // Find user's active spot
    const userSpot = userId ? spots.find(s => s.reserved_by === userId) : null;

    // Simple stats
    const totalSpots = spots.length;
    const availableSpots = spots.filter(s => s.status === 0).length;
    const occupiedSpots = spots.filter(s => s.status === 2).length;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Active Reservation Card */}
            {userSpot && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-16 blur-3xl" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-blue-100 mb-1">
                                <Clock size={16} />
                                <span className="text-sm font-medium uppercase tracking-wider">Current Session</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-1">{userSpot.spot_number}</h3>
                            <p className="text-blue-100 flex items-center gap-2">
                                <MapPin size={16} />
                                Floor {userSpot.floor_level} • Zone ID {userSpot.zone_id}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="text-center">
                                <span className="block text-2xl font-bold">{userSpot.status === 1 ? 'Reserved' : 'Parked'}</span>
                                <span className="text-xs text-blue-200 uppercase">Status</span>
                            </div>
                        </div>

                        <Link
                            href="/dashboard/map"
                            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors shadow-lg"
                        >
                            <span>View on Map</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Parking Overview</h2>
                <div className="flex space-x-4">
                    <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
                        <span className="text-sm text-slate-500">Available</span>
                        <p className="text-xl font-bold text-green-600">{availableSpots}</p>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
                        <span className="text-sm text-slate-500">Occupied</span>
                        <p className="text-xl font-bold text-red-600">{occupiedSpots}</p>
                    </div>
                </div>
            </div>

            {/* Grid of Spots */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {spots.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        No spots found. Database might be empty.
                    </div>
                ) : (
                    spots.map((spot) => <SpotCard key={spot.id} spot={spot} />)
                )}
            </div>
        </div>
    );
}

function SpotCard({ spot }: { spot: Spot }) {
    const statusColors = {
        0: 'bg-green-100 border-green-300 text-green-700', // Available
        1: 'bg-yellow-100 border-yellow-300 text-yellow-700', // Reserved
        2: 'bg-red-100 border-red-300 text-red-700', // Occupied
    };

    const statusLabels = {
        0: 'Available',
        1: 'Reserved',
        2: 'Occupied',
    };

    return (
        <div
            className={clsx(
                'relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center h-32',
                statusColors[spot.status]
            )}
        >
            <span className="text-lg font-bold">{spot.spot_number}</span>
            <span className="text-xs uppercase tracking-wider font-semibold mt-1">
                {statusLabels[spot.status]}
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] opacity-70">
                L{spot.floor_level}
            </span>
        </div>
    );
}
