import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser components.
 * Uses anon key + user's JWT from cookies — RLS is enforced.
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
