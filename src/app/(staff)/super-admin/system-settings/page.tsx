import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivePlatformSettings } from "@/lib/platform-settings";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
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

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const activeSettings = await getActivePlatformSettings();

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.22)]">
                <Settings2 className="h-3 w-3" />
                System Settings
              </span>
              <span className="text-xs text-slate-400">
                Super Admin Control
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              System Settings
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Configure real-time registration gates, file upload limits, and
              maintenance windows.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <SettingsForm
          initialSettings={{
            registration_open: activeSettings.registration_open,
            max_upload_size_mb: activeSettings.max_upload_size_mb,
            maintenance_mode: activeSettings.maintenance_mode,
            maintenance_message:
              activeSettings.maintenance_message ||
              "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.",
            maintenance_start_time: activeSettings.maintenance_start_time,
            maintenance_end_time: activeSettings.maintenance_end_time,
            maintenance_bypass_student_ids:
              activeSettings.maintenance_bypass_student_ids,
            updated_at: new Date().toISOString(),
          }}
        />

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Real-Time Platform Control:
            </span>{" "}
            Changes saved here take effect immediately across registration,
            material uploads, and maintenance middleware.
          </p>
        </section>
      </main>
    </div>
  );
}