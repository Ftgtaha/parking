'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

type UserRole = 'student' | 'admin';

interface UserContextType {
    role: UserRole;
    setRole: (role: UserRole) => void;
    toggleRole: () => void;
    userId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

import { supabase } from '@/lib/supabaseClient';

export function UserProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<UserRole>('student');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUserId(session.user.id);

                // Fetch Role from DB
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile && profile.role) {
                    setRole(profile.role as UserRole);
                }
            } else {
                setUserId(null);
                setRole('student'); // Default fallback
            }
        };

        // Initial fetch
        fetchUserData();

        // Realtime Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
                // We re-fetch profile to be safe, or we could decode metadata if role is there
                supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile && profile.role) {
                            setRole(profile.role as UserRole);
                        }
                    });
            } else {
                setUserId(null);
                setRole('student');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const toggleRole = () => {
        setRole((prev) => (prev === 'student' ? 'admin' : 'student'));
    };

    return (
        <UserContext.Provider value={{ role, setRole, toggleRole, userId }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
