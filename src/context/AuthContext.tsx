import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Restore user from cached session immediately to avoid flicker/redirect
    try {
      const stored = localStorage.getItem('sb-evuswzfmrfkmlcdsphgu-auth-token');
      if (stored) {
        const parsed = JSON.parse(stored);
        const session = parsed?.currentSession || parsed;
        if (session?.user) return session.user as User;
      }
    } catch {}
    return null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — resolve loading even if network is down
    const timeout = setTimeout(() => setLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      clearTimeout(timeout);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Only clear user if we got a definitive "no session" response while online
      if (session) {
        setUser(session.user);
      } else if (navigator.onLine) {
        setUser(null);
      }
      // If offline and no session returned, keep the cached user
      setLoading(false);
      clearTimeout(timeout);
    }).catch(() => {
      // Network error — keep cached user, stop loading
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
