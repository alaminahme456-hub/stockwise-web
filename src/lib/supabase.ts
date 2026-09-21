import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or custom connection store
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('stockwise_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('stockwise_supabase_key') || '' : '';

  return {
    url: (envUrl || storedUrl).trim(),
    key: (envKey || storedKey).trim(),
  };
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('stockwise_supabase_url', url.trim());
    localStorage.setItem('stockwise_supabase_key', key.trim());
    // Reload to apply new client instance
    window.location.reload();
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stockwise_supabase_url');
    localStorage.removeItem('stockwise_supabase_key');
    window.location.reload();
  }
}

const { url, key } = getSupabaseCredentials();

// Fallback dummy client if no credentials set to avoid throwing on module load
export const isSupabaseConfigured = Boolean(url && key && url.startsWith('http'));

export const supabase: SupabaseClient = createClient(
  url && url.startsWith('http') ? url : 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
