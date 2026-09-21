import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';
import { 
  isDemoActive, 
  getActiveDemoAccount, 
  setActiveDemoRole, 
  clearDemoSession, 
  DEMO_ACCOUNTS,
  DemoUserAccount
} from '../lib/demoData';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  loginWithDemo: (role?: 'owner' | 'manager' | 'cashier') => void;
  exitDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createMockUserFromDemo(account: DemoUserAccount): { user: User; session: Session; profile: Profile } {
  const user: User = {
    id: account.id,
    app_metadata: { provider: 'demo' },
    user_metadata: { full_name: account.fullName, role: account.role },
    aud: 'authenticated',
    confirmation_sent_at: '',
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    email: account.email,
    email_confirmed_at: new Date().toISOString(),
    identities: [],
    invited_at: '',
    last_sign_in_at: new Date().toISOString(),
    phone: '',
    recovery_sent_at: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    factors: [],
  };

  const session: Session = {
    access_token: 'demo-access-token-xyz',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'demo-refresh-token',
    user,
  };

  const profile: Profile = {
    id: account.id,
    email: account.email,
    full_name: account.fullName,
    role: account.role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { user, session, profile };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
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
    // 1. Check if demo session is already active in local storage
    if (isDemoActive()) {
      const demoAcc = getActiveDemoAccount();
      if (demoAcc) {
        const mock = createMockUserFromDemo(demoAcc);
        setUser(mock.user);
        setSession(mock.session);
        setProfile(mock.profile);
        setIsDemo(true);
        setLoading(false);
        return;
      }
    }

    // 2. If Supabase is not configured, we keep loading false and ready for demo or setup
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 3. Initial Supabase Session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('Failed to retrieve Supabase session:', err);
      setLoading(false);
    });

    // 4. Listen to Auth State changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isDemoActive()) {
        return; // Don't override demo state
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithDemo = (role: 'owner' | 'manager' | 'cashier' = 'owner') => {
    setActiveDemoRole(role);
    const acc = DEMO_ACCOUNTS[role];
    const mock = createMockUserFromDemo(acc);
    setUser(mock.user);
    setSession(mock.session);
    setProfile(mock.profile);
    setIsDemo(true);
  };

  const exitDemo = () => {
    clearDemoSession();
    setIsDemo(false);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const signIn = async (email: string, password: string) => {
    const trimmed = email.toLowerCase().trim();

    // Check if user is trying to log in with a demo email
    const matchedDemo = Object.values(DEMO_ACCOUNTS).find((d) => d.email.toLowerCase() === trimmed);
    if (matchedDemo || trimmed === 'demo@altech.com' || (!isSupabaseConfigured && trimmed.includes('demo'))) {
      const role = matchedDemo?.role as 'owner' | 'manager' | 'cashier' || 'owner';
      loginWithDemo(role);
      return { error: null };
    }

    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.data.user) {
        clearDemoSession();
        setIsDemo(false);
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
      if (isDemo) {
        exitDemo();
        return;
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      clearDemoSession();
      setIsDemo(false);
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
    if (isDemo) {
      const demoAcc = getActiveDemoAccount();
      if (demoAcc) {
        setProfile({
          id: demoAcc.id,
          email: demoAcc.email,
          full_name: demoAcc.fullName,
          role: demoAcc.role,
        });
      }
      return;
    }
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
        isDemo,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        loginWithDemo,
        exitDemo,
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

