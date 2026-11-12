import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { signOut } from "@/server/actions/auth";
import {
  ShieldCheck,
  FileCheck2,
  UploadCloud,
  Users,
  BellRing,
  KeyRound,
  LogOut,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Trash2, UserCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    redirect("/staff-login");
  }

  async function handleSignOut() {
    "use server";
    const result = await signOut();
    if (result.success) {
      redirect("/staff-login");
    }
  }

  // Fetch live institutional metrics in parallel
  const serviceRole = createServiceRoleClient();
  const [
    pendingVerifRes,
    verifiedStudentsRes,
    pendingMaterialsRes,
    noticesRes,
  ] = await Promise.all([
    serviceRole
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("is_verified", false),
    serviceRole
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("is_verified", true),
    serviceRole
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    serviceRole
      .from("notices")
      .select("id", { count: "exact", head: true }),
  ]);

  const pendingVerifications = pendingVerifRes.count ?? 0;
  const verifiedStudents = verifiedStudentsRes.count ?? 0;
  const pendingMaterials = pendingMaterialsRes.count ?? 0;
  const activeNotices = noticesRes.count ?? 0;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100 selection:bg-amber-500/30">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      {/* Top Institutional Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  Admin Console
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">•</span>
                <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                  JTEC Academic Platform
                </span>
              </div>
              <h1 className="mt-0.5 font-serif text-xl font-bold tracking-tight text-white sm:text-2xl">
                Administration Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {profile.full_name || "Administrator"}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                {profile.role.replace("_", " ")}
              </p>
            </div>
            <Link href="/admin/profile" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:text-amber-300"><UserCircle2 className="h-3.5 w-3.5 text-amber-400" /><span>Profile</span></Link><form action={handleSignOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition-all hover:border-rose-500/50 hover:bg-rose-500/20 hover:text-rose-200 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Top 4 Live KPI Stat Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* KPI 1: Pending ID Verifications */}
          <div className="group rounded-2xl border border-slate-800/90 bg-[#0A1020]/90 p-5 shadow-lg transition-all hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                Verification Queue
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400">Pending ID Verifications</p>
              <p className="mt-1 font-serif text-3xl font-bold text-white">
                {pendingVerifications}
              </p>
            </div>
          </div>

          {/* KPI 2: Materials Review */}
          <div className="group rounded-2xl border border-slate-800/90 bg-[#0A1020]/90 p-5 shadow-lg transition-all hover:border-sky-500/40">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300">
                Coursework
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400">Pending Materials Review</p>
              <p className="mt-1 font-serif text-3xl font-bold text-white">
                {pendingMaterials}
              </p>
            </div>
          </div>

          {/* KPI 3: Verified Students */}
          <div className="group rounded-2xl border border-slate-800/90 bg-[#0A1020]/90 p-5 shadow-lg transition-all hover:border-indigo-500/40">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.12)]">
                <Users className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                Active Directory
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400">Verified Students</p>
              <p className="mt-1 font-serif text-3xl font-bold text-white">
                {verifiedStudents}
              </p>
            </div>
          </div>

          {/* KPI 4: Active Notices */}
          <div className="group rounded-2xl border border-slate-800/90 bg-[#0A1020]/90 p-5 shadow-lg transition-all hover:border-cyan-500/40">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                <BellRing className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                Notice Board
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400">Published Notices</p>
              <p className="mt-1 font-serif text-3xl font-bold text-white">
                {activeNotices}
              </p>
            </div>
          </div>
        </section>

        {/* 6 Section-Matched Action Module Cards */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-white sm:text-xl">
                Institutional Modules
              </h2>
              <p className="text-xs text-slate-400">
                Select a management module below to review records, publish results, or configure access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. ID Card Verification (Amber/Gold) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    ID Card Verification
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Inspect uploaded student ID cards, verify against institutional records, and approve academic access.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {pendingVerifications} Pending Verification
                </span>
                <Link
                  href="/admin/students/verification"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-300 transition-all hover:bg-amber-500/25 hover:text-amber-200"
                >
                  <span>Review Queue</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 2. Materials Review (Sky Blue) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Materials Review
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Review, moderate, and approve uploaded lecture notes, lab sheets, and departmental coursework.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  {pendingMaterials} Awaiting Approval
                </span>
                <Link
                  href="/admin/materials-review"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-300 transition-all hover:bg-sky-500/25 hover:text-sky-200"
                >
                  <span>Inspect Materials</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 3. Results Upload (Emerald Green) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Results Upload
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Upload, validate, and publish official semester examination GPA, CGPA, and retake records.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Publishing
                </span>
                <Link
                  href="/admin/results/upload"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/25 hover:text-emerald-200"
                >
                  <span>Upload Results</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 4. Student Management (Indigo/Violet) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Student Management
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Search, inspect, and manage registered student profiles, academic batches, and enrollment status.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {verifiedStudents} Verified Records
                </span>
                <Link
                  href="/admin/students"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-2 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-500/25 hover:text-indigo-200"
                >
                  <span>Manage Directory</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 5. Notices & Circulars (Cyan/Teal) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Notices &amp; Circulars
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <BellRing className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Draft, pin, and publish official institutional announcements, exam schedules, and circulars.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    {activeNotices} Active
                  </span>
                  <Link
                    href="/admin/notices/bulk-delete"
                    title="Bulk Delete Notices"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Bulk Delete</span>
                  </Link>
                </div>
                <Link
                  href="/admin/notices"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-300 transition-all hover:bg-cyan-500/25 hover:text-cyan-200"
                >
                  <span>Publish Notice</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 6. Upload Permissions (Subtle Rose/Coral - Clean dark card) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-500/50">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl font-bold text-white">
                    Upload Permissions
                  </h3>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  Configure and grant authorized students or class representatives permission to upload materials.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Access Control
                </span>
                <Link
                  href="/admin/students/upload-permissions"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/25 hover:text-rose-200"
                >
                  <span>Manage Access</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}