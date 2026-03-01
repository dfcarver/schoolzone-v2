import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key (bypasses RLS).
// Only available when SUPABASE_SERVICE_ROLE_KEY is set.
export const supabaseAdmin: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
