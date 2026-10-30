import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jorghleuygkkxryvfmzr.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Detect if we have real Supabase publishable credentials or a placeholder
export const isSupabaseConfigured = 
  Boolean(supabasePublishableKey) && 
  !supabasePublishableKey.includes('placeholder_key') &&
  !supabasePublishableKey.includes('<SUPABASE_PUBLISHABLE_KEY>');

export const supabase = createClient(
  supabaseUrl, 
  isSupabaseConfigured ? supabasePublishableKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
);

export const SUPABASE_URL = supabaseUrl;
