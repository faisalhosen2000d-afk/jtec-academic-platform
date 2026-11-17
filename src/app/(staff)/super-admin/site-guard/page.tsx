import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SiteGuardClient } from "@/components/admin/SiteGuardClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminSiteGuardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceSupabase = createServiceRoleClient();
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#060A12] p-5 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0A1020] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Super Admin
        </Link>
        <SiteGuardClient />
      </div>
    </div>
  );
}