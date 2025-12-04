import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service role key
 *
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in server-side code (API routes, scrapers, cron jobs).
 *
 * NEVER expose this client to the browser or client-side code.
 *
 * Use cases:
 * - Scrapers writing to database
 * - Admin operations
 * - Cron jobs
 * - Server-side data operations that need to bypass RLS
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
