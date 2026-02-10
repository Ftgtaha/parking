'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Spot = {
    id: number;
    zone_id: number;
    spot_number: string;
    floor_level: number;
    status: 0 | 1 | 2; // 0: Available, 1: Reserved, 2: Occupied
    x_coord: number;
    y_coord: number;
    reserved_by?: string | null;
};

export function useRealtimeSpots(zoneId?: number) {
    const [spots, setSpots] = useState<Spot[]>([]);
    const [loading, setLoading] = useState(true);

    const [status, setStatus] = useState<string>('CONNECTING');

    useEffect(() => {
        let query = supabase.from('spots').select('*');
        if (zoneId) {
            query = query.eq('zone_id', zoneId);
        }

        const fetchSpots = async () => {
            const { data, error } = await query;
            if (data && !error) {
                setSpots(data as Spot[]);
            }
            setLoading(false);
        };

        fetchSpots();

        const channel = supabase
            .channel('realtime_spots')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'spots',
                    filter: zoneId ? `zone_id=eq.${zoneId}` : undefined,
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    if (payload.eventType === 'INSERT') {
                        setSpots((prev) => [...prev, payload.new as Spot]);
                    } else if (payload.eventType === 'UPDATE') {
                        setSpots((prev) =>
                            prev.map((spot) => (spot.id === payload.new.id ? { ...spot, ...payload.new } as Spot : spot))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setSpots((prev) => prev.filter((spot) => spot.id !== payload.old.id));
                    }
                }
            )
            .subscribe((state) => {
                setStatus(state);
                console.log('Realtime Status:', state);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [zoneId]);

    const updateSpot = (id: number, updates: Partial<Spot>) => {
        setSpots((prev) =>
            prev.map((spot) => (spot.id === id ? { ...spot, ...updates } as Spot : spot))
        );
    };

    const addSpot = (spot: Spot) => {
        setSpots((prev) => [...prev, spot]);
    };

    const removeSpot = (id: number) => {
        setSpots((prev) => prev.filter((spot) => spot.id !== id));
    };

    return { spots, loading, status, updateSpot, addSpot, removeSpot };
}
