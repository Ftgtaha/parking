'use client';

import { useUser } from '@/contexts/UserContext';
import { User, ShieldCheck, Mail, Hash, Loader2, Car, XCircle, CheckCircle2, LogOut, Clock } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SpotData = {
    id: number;
    spot_number: string;
    status: number;
    zone_id: number;
    floor_level: number;
    reserved_at: string | null;
    zones?: {
        name: string;
    }
};

export default function ProfilePage() {
    const { role, userId } = useUser();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [spot, setSpot] = useState<SpotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const RESERVATION_TIME_MS = 10 * 60 * 1000; // 10 minutes

    const [stats, setStats] = useState({
        totalSpots: 0,
        activeReservations: 0,
        totalUsers: 0
    });

    const fetchProfileData = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch User Profile
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            setProfile(userData);

            // 1.5 Fetch Admin Stats if applicable
            if (role === 'admin') {
                const [spotsRes, usersRes, activeRes] = await Promise.all([
                    supabase.from('spots').select('*', { count: 'exact', head: true }),
                    supabase.from('users').select('*', { count: 'exact', head: true }),
                    supabase.from('spots').select('*', { count: 'exact', head: true }).in('status', [1, 2])
                ]);

                setStats({
                    totalSpots: spotsRes.count || 0,
                    totalUsers: usersRes.count || 0,
                    activeReservations: activeRes.count || 0
                });
            }

            // 2. Fetch Active Reservation (Strictly for this user)
            const { data: spotData, error: spotError } = await supabase
                .from('spots')
                .select('*, zones(name)')
                .eq('reserved_by', userId)
                .maybeSingle();

            if (spotData) {
                setSpot(spotData as SpotData);
            } else {
                setSpot(null);
                setTimeLeft(null);
            }

        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

    // Timer Logic
    useEffect(() => {
        if (spot?.status === 1 && spot.reserved_at) {
            const startTime = new Date(spot.reserved_at).getTime();
            const endTime = startTime + RESERVATION_TIME_MS;

            const updateTimer = () => {
                const now = new Date().getTime();
                const remaining = endTime - now;

                if (remaining <= 0) {
                    setTimeLeft(0);
                    // Expired - Auto Cancel
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleSpotAction(0, true);
                } else {
                    setTimeLeft(remaining);
                }
            };

            updateTimer(); // Initial call
            timerRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else {
            setTimeLeft(null);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [spot?.status, spot?.reserved_at]);

    // Handle Spot Actions
    const handleSpotAction = async (newStatus: number, isAutoCancel = false) => {
        if (!spot || !userId) return;

        // Prevent recursive loop if already canceling
        if (isAutoCancel && actionLoading) return;

        setActionLoading(true);

        try {
            const updates: any = { status: newStatus };
            // If making available (0), clear reserved_by
            if (newStatus === 0) {
                updates.reserved_by = null;
                updates.reserved_at = null;
            } else if (newStatus === 2) {
                // parking confirmed, clear timer
                updates.reserved_at = null;
            }

            const { error } = await supabase
                .from('spots')
                .update(updates)
                .eq('id', spot.id)
                .eq('reserved_by', userId); // Extra safety: ensure we still own it

            if (error) throw error;

            if (isAutoCancel) {
                alert('Reservation expired! The spot has been released.');
            }

            // Refresh data
            await fetchProfileData();

        } catch (err: any) {
            if (!isAutoCancel) alert('Action failed: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    if (!profile) {
        return <div className="p-8 text-center text-slate-500">Please sign in to view your profile.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {role === 'admin' && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                        <p className="text-sm text-slate-500 font-medium">Total Spots</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.totalSpots}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                        <p className="text-sm text-slate-500 font-medium">Active Users</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                        <p className="text-sm text-slate-500 font-medium">Occupied/Reserved</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.activeReservations}</p>
                    </div>
                </div>
            )}

            <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>

            {/* Profile Card */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="p-4 bg-slate-100 rounded-full shrink-0">
                    {role === 'admin' ? (
                        <ShieldCheck size={48} className="text-green-500" />
                    ) : (
                        <User size={48} className="text-blue-500" />
                    )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {profile.student_id ? `ID: ${profile.student_id}` : 'No ID Set'}
                    </h2>

                    <div className="text-slate-500 flex items-center justify-center md:justify-start gap-2">
                        <Mail size={16} />
                        <span>{profile.email}</span>
                    </div>

                    <div className="pt-2">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${role === 'admin'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                            Role: {role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Booking / Status Card */}
            <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <Hash size={20} />
                    Current Reservation
                </h3>

                {!spot ? (
                    <div className="bg-slate-50 p-8 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                        <p>No active reservations.</p>
                        <button
                            onClick={() => router.push('/dashboard/map')}
                            className="mt-4 text-blue-600 font-bold hover:underline"
                        >
                            Go to Map to Book
                        </button>
                    </div>
                ) : (
                    <div className={`p-6 rounded-xl border shadow-sm transition-all ${spot.status === 1
                        ? 'bg-purple-50 border-purple-200 shadow-purple-100'
                        : 'bg-green-50 border-green-200 shadow-green-100'
                        }`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${spot.status === 1 ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200'
                                        }`}>
                                        {spot.status === 1 ? 'Pending Confirmation' : 'Active Parking'}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-800 flex items-baseline gap-2">
                                    {spot.spot_number}
                                    <span className="text-sm font-medium text-slate-500">
                                        {spot.zones?.name} • Floor {spot.floor_level}
                                    </span>
                                </h2>
                            </div>
                            <div className={`p-3 rounded-full flex flex-col items-center gap-1 ${spot.status === 1 ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'
                                }`}>
                                <Car size={24} />
                            </div>
                        </div>

                        {/* Timer Display */}
                        {spot.status === 1 && timeLeft !== null && (
                            <div className="mb-6 p-4 bg-white rounded-xl border border-purple-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 text-red-500 rounded-lg animate-pulse">
                                        <Clock size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-600">Time to confirm:</span>
                                </div>
                                <span className={`text-2xl font-mono font-bold ${timeLeft < 60000 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {spot.status === 1 && (
                                <>
                                    <p className="text-sm text-slate-600 mb-4">
                                        You have reserved this spot. Please confirm when you park, or cancel to free it up.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleSpotAction(2)}
                                            disabled={actionLoading}
                                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                                            Confirm Parking
                                        </button>
                                        <button
                                            onClick={() => handleSpotAction(0)}
                                            disabled={actionLoading}
                                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                        >
                                            <XCircle size={18} />
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}

                            {spot.status === 2 && (
                                <>
                                    <p className="text-sm text-slate-600 mb-4">
                                        You are currently parked here. Have a safe day!
                                    </p>
                                    <button
                                        onClick={() => handleSpotAction(0)}
                                        disabled={actionLoading}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="animate-spin" /> : <LogOut size={18} />}
                                        Leave Spot
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
