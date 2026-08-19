import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Singleton ────────────────────────────────────────────────────────────────
// Next.js (Turbopack + HMR) can re-evaluate modules, creating multiple
// GoTrueClient instances that share the same localStorage key and fire
// conflicting INITIAL_SESSION / SIGNED_OUT events → instant logout loop.
// Storing on globalThis ensures exactly ONE client exists in the browser.
const g = globalThis as unknown as { __supabase?: SupabaseClient };

if (!g.__supabase) {
  g.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Explicit localStorage so stale access_token/refresh_token cookies
      // from previous custom-JWT systems on localhost are never picked up.
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = g.__supabase;
