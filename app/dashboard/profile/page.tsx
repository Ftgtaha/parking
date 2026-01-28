'use client';

import { useUser } from '@/contexts/UserContext';
import { User, ShieldCheck, Mail, Hash, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
    const { role, userId } = useUser();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ activeReservation: false, spotNumber: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch User Profile (email, student_id)
                // We can get email from Auth User or public.users if stored there.
                // Our schema stores email in public.users too.
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (userError) throw userError;
                setProfile(userData);

                // 2. Fetch Active Reservation
                // Check if any spot is reserved by this user
                const { data: spotData, error: spotError } = await supabase
                    .from('spots')
                    .select('spot_number')
                    .eq('reserved_by', userId)
                    .maybeSingle();

                if (spotData) {
                    setStats({ activeReservation: true, spotNumber: spotData.spot_number });
                } else {
                    setStats({ activeReservation: false, spotNumber: '' });
                }

            } catch (err) {
                console.error('Error loading profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId]);

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    if (!profile) {
        return <div className="p-8 text-center text-slate-500">Please sign in to view your profile.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
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

            {/* Stats Card */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Hash size={18} />
                    Current Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <span className="text-sm text-slate-500 font-medium uppercase">Active Reservation</span>
                        <div className="mt-1 flex items-baseline gap-2">
                            {stats.activeReservation ? (
                                <>
                                    <span className="text-2xl font-black text-blue-600">Spot {stats.spotNumber}</span>
                                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-md">ACTIVE</span>
                                </>
                            ) : (
                                <span className="text-xl font-medium text-slate-400">None</span>
                            )}
                        </div>
                    </div>

                    {/* Removed "Violations" & "Total" as they are not supported by schema */}
                </div>
            </div>
        </div>
    );
}
