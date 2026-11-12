import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultUploadClient from "./ResultUploadClient";
import { ArrowLeft, UploadCloud } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminResultUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  let canUploadResults = profile.role === "super_admin";
  if (profile.role === "admin") {
    const { data: resultScopes } = await supabase.from("staff_scopes").select("id").eq("profile_id", user.id).eq("can_verify_results", true).limit(1);
    canUploadResults = Boolean(resultScopes && resultScopes.length > 0);
  }

  const [
    { data: departments },
    { data: batches },
    { data: levels },
    { data: terms },
  ] = await Promise.all([
    supabase.from("departments").select("id, name, code").order("name"),
    supabase.from("batches").select("id, name").order("name"),
    supabase.from("levels").select("id, name").order("name"),
    supabase.from("terms").select("id, name").order("name"),
  ]);

  const backHref = profile.role === "super_admin" ? "/super-admin" : "/admin";
  const backLabel =
    profile.role === "super_admin"
      ? "Back to Super Admin"
      : "Back to Admin Console";

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                <UploadCloud className="h-3 w-3" />
                Academic Examination Office
              </span>
              <span className="text-xs text-slate-400">
                Staff Administration
              </span>
            </div>
            <h1 className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl">
              Batch Result Upload &amp; Air-Drop
            </h1>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-emerald-500/50 hover:text-emerald-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <ResultUploadClient
          departments={departments || []}
          batches={batches || []}
          levels={levels || []}
          terms={terms || []}
          canUploadResults={canUploadResults}
        />
      </main>
    </div>
  );
}