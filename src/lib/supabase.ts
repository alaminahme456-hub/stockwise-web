import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configured Supabase project provided by user
export const DEFAULT_SUPABASE_URL = 'https://kvofvaiqmjnvzcpphisr.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2b2Z2YWlxbWpudnpjcHBoaXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNjUzODgsImV4cCI6MjEwNTk0MTM4OH0.9XKAJkhwZcIfszVhMTJZCyZxGO3fe_lrWu6VGmWfsXs';

// Retrieve credentials from environment variables, custom connection store, or configured defaults
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('stockwise_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('stockwise_supabase_key') || '' : '';

  const url = (envUrl || storedUrl || DEFAULT_SUPABASE_URL).trim();
  const key = (envKey || storedKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    key,
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
