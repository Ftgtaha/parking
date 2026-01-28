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

// Init Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function UserProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<UserRole>('student');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch real Supabase user
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUserId(user.id);

                // Fetch Role from DB
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.role) {
                    setRole(profile.role as UserRole);
                }
            } else {
                // For demo: Generate a random ID if not logged in
                const demoId = '00000000-0000-0000-0000-000000000000';
                setUserId(demoId);
            }
        };
        getUser();
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
