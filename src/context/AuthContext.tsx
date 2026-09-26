import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      } else if (!data) {
        // Create initial profile if missing
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || '',
          })
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    // Clean up any old demo storage keys from previous sessions
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stockwise_active_demo_role');
      localStorage.removeItem('stockwise_demo_database_v2');
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Initial Supabase Session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem('stockwise_active_user_id', session.user.id);
        fetchProfile(session.user.id);
      } else {
        localStorage.removeItem('stockwise_active_user_id');
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('Failed to retrieve Supabase session:', err);
      setLoading(false);
    });

    // 2. Listen to Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        localStorage.setItem('stockwise_active_user_id', session.user.id);
        await fetchProfile(session.user.id);
      } else {
        localStorage.removeItem('stockwise_active_user_id');
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.data.user) {
        localStorage.setItem('stockwise_active_user_id', res.data.user.id);
        setUser(res.data.user);
        setSession(res.data.session);
        await fetchProfile(res.data.user.id);
      }
      return { error: res.error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (res.data.user) {
      localStorage.setItem('stockwise_active_user_id', res.data.user.id);
      try {
        await supabase.from('profiles').upsert({
          id: res.data.user.id,
          email,
          full_name: fullName || '',
        });
      } catch (e) {
        console.error('Profile creation error:', e);
      }
    }

    return { error: res.error, data: res.data };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      localStorage.removeItem('stockwise_active_user_id');
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    const res = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error: res.error };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
