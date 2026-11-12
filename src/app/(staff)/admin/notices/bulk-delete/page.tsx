import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BulkDeleteNoticeForm from "./BulkDeleteNoticeForm";

export default async function BulkDeleteNoticesPage() {
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
    redirect("/");
  }

  let canDelete = profile.role === "super_admin";

  if (profile.role === "admin") {
    const { data: deleteScopes } = await supabase
      .from("staff_scopes")
      .select("can_delete_notices")
      .eq("profile_id", user.id)
      .eq("can_delete_notices", true);

    canDelete = Boolean(deleteScopes && deleteScopes.length > 0);
  }

  if (!canDelete) {
    redirect("/admin/notices");
  }

  return (
    <main className="min-h-screen bg-[#060A12] text-slate-100">
      <header className="pt-6 pb-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="h-3 w-3" />
                Danger Zone
              </span>
              <span className="text-xs text-slate-400">Notice Management</span>
            </div>
            <h1 className="mt-2.5 font-serif text-2xl font-bold text-white sm:text-3xl">
              Bulk Delete Notices
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Permanently delete multiple notices by selecting a date range.
            </p>
          </div>

          <Link
            href="/admin/notices"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Notices</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-rose-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(244,63,94,0.08)] transition-all duration-300 hover:border-rose-400/60 hover:shadow-[0_0_50px_rgba(244,63,94,0.18)] sm:p-8">
          <h2 className="text-lg font-semibold text-white">Select Date Range</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose the period whose notices you want to permanently delete.
          </p>

          <div className="mt-6">
            <BulkDeleteNoticeForm />
          </div>
        </section>
      </div>
    </main>
  );
}