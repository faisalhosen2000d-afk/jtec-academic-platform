import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client using the service-role key. This BYPASSES
 * Row Level Security entirely.
 *
 * Per the approved security architecture (finalized spec Â§7 / Â§9):
 * - Never import this in any file reachable from the browser bundle.
 * - Only used inside trusted server contexts: scheduled Edge Functions,
 *   the staff-account creation flow, and background jobs (ranking
 *   recompute, contributor scoring, batched view/download aggregation).
 * - Every call site using this client MUST perform its own explicit
 *   role/permission check before acting, since RLS will not do it here.
 *
 * The `server-only` import above causes a build-time error if this
 * module is ever imported from client code.
 */
export function createServiceRoleClient() {

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}




