import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase-browser] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.');
}

/**
 * Browser-side Supabase client.
 * Uses the anon key — safe to expose in the frontend.
 * Session is persisted in localStorage automatically.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
