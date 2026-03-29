import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { getStoredSession, getStoredUser } from '@/lib/localCache';

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
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [session, setSession] = useState<Session | null>(() => getStoredSession());
  const [loading, setLoading] = useState(() => !getStoredUser());

  useEffect(() => {
    const resolveSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const timeout = setTimeout(() => setLoading(false), 1500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
      clearTimeout(timeout);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resolveSession(session);
      } else if (navigator.onLine) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
      clearTimeout(timeout);
    }).catch(() => {
      setLoading(false);
      clearTimeout(timeout);
    });

    const handleReconnect = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) resolveSession(session);
      }).catch(() => {});
    };

    window.addEventListener('online', handleReconnect);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      window.removeEventListener('online', handleReconnect);
    };
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
    setSession(null);
    setUser(null);
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
