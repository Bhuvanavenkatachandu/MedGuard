import { supabase } from '../../lib/supabase';

/**
 * Supabase client helper for React + Vite.
 * In a Vite SPA, the client runs directly in the browser with localStorage session persistence.
 */
export const createClient = () => supabase;

export { supabase };
