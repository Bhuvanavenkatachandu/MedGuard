import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jorghleuygkkxryvfmzr.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Check if a real Supabase key is configured rather than an unpopulated template placeholder
export const isSupabaseConfigured = 
  Boolean(supabasePublishableKey) && 
  !supabasePublishableKey.includes('placeholder') &&
  !supabasePublishableKey.includes('<') &&
  !supabasePublishableKey.includes('MY_SUPABASE_PUBLISHABLE_KEY') &&
  !supabasePublishableKey.includes('SUPABASE_PUBLISHABLE_KEY');

// Initialize the Supabase Client with Auth Session persistence
export const supabase = createClient(
  supabaseUrl, 
  isSupabaseConfigured ? supabasePublishableKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

export const SUPABASE_URL = supabaseUrl;
