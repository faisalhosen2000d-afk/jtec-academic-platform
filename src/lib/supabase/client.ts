import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Uses the public anon key — RLS applies
 * to every query made through this client. Never import the service-role
 * client anywhere this file is reachable from.
 *
 * The `Database` generic type will be generated from the finalized schema
 * in Phase C (`supabase gen types typescript`).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
