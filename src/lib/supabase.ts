import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing env var NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing env var SUPABASE_SERVICE_ROLE_KEY");

  serviceClient = createClient(url, key);
  return serviceClient;
}
