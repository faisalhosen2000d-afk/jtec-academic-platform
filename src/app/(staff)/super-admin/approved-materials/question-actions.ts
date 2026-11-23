"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createMaterialSignedUrl } from "@/lib/material-storage";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";

export async function getSuperAdminQuestionOpenUrl(
  itemId: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    return { success: false, error: "Super Admin access required." };
  }

  const rawSb = createRawSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: item, error } = await rawSb
    .from("question_bank_items")
    .select("id, file_path")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !item || !item.file_path) {
    return { success: false, error: "Question file not found." };
  }

  const serviceRole = createServiceRoleClient();
  const url = await createMaterialSignedUrl(serviceRole, String(item.file_path), 3600);
  if (!url) return { success: false, error: "Could not generate signed URL." };
  return { success: true, url };
}
