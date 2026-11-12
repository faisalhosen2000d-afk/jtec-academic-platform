import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { signOut } from "@/server/actions/auth";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Crown,
  FileCheck2,
  FileSpreadsheet,
  KeyRound,
  Layers,
  LogOut,
  ScrollText,
  Settings,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  UserCircle2,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  action: string;
  accent: "emerald" | "amber" | "violet" | "cyan" | "sky" | "blue" | "indigo" | "rose";
  icon: "results" | "structure" | "progression" | "codes" | "notices" | "pending" | "approved" | "requests" | "users" | "audit" | "settings";
};

const academicModules: ModuleCard[] = [
  {
    title: "Publish Term Results & Air Drops",
    description:
      "Upload official term GPA/CGPA sheets, detect missing student rolls, and manage air drop batch migrations.",
    href: "/admin/results/upload",
    action: "Manage Results",
    accent: "emerald",
    icon: "results",
  },
  {
    title: "Academic Structure",
    description:
      "Manage departments, batches, levels, terms, and subjects across the institution.",
    href: "/super-admin/academic-structure",
    action: "Configure",
    accent: "amber",
    icon: "structure",
  },
  {
    title: "Academic Progression",
    description:
      "Review student batches, preview academic assignments, and prepare term progression.",
    href: "/super-admin/academic-progression",
    action: "View Details",
    accent: "violet",
    icon: "progression",
  },
  {
    title: "Registration Codes",
    description:
      "Create and manage student registration codes with academic batch assignments.",
    href: "/super-admin/registration-codes/manage",
    action: "Generate",
    accent: "cyan",
    icon: "codes",
  },
];

const contentModules: ModuleCard[] = [
  {
    title: "Notice Management",
    description:
      "Create, pin, and publish official academic notices and circulars for students.",
    href: "/admin/notices",
    action: "Manage",
    accent: "cyan",
    icon: "notices",
  },
  {
    title: "Pending Materials Review",
    description:
      "Review, approve, or reject student-submitted academic materials awaiting moderation.",
    href: "/admin/materials-review",
    action: "Inspect Queue",
    accent: "sky",
    icon: "pending",
  },
  {
    title: "Approved Materials",
    description:
      "Review approved academic materials and manage Super Admin deletion controls.",
    href: "/super-admin/approved-materials",
    action: "Manage Vault",
    accent: "blue",
    icon: "approved",
  },
];

const governanceModules: ModuleCard[] = [
  {
    title: "Account Requests",
    description:
      "Review and approve or reject Administrator and Moderator account requests.",
    href: "/super-admin/account-requests",
    action: "Review Requests",
    accent: "amber",
    icon: "requests",
  },
  {
    title: "Users & Permissions",
    description:
      "Manage students, admins, moderators, and granular staff permission scopes.",
    href: "/super-admin/users",
    action: "Configure",
    accent: "indigo",
    icon: "users",
  },
  {
    title: "Audit Logs",
    description:
      "Review important administrative, moderation, and system-wide activities.",
    href: "/super-admin/audit-logs",
    action: "Audit Logs",
    accent: "violet",
    icon: "audit",
  },
  {
    title: "System Settings",
    description:
      "Manage platform-level configuration, security policies, and system settings.",
    href: "/super-admin/system-settings",
    action: "System Settings",
    accent: "rose",
    icon: "settings",
  },
];

const accentMap: Record<
  ModuleCard["accent"],
  {
    topLine: string;
    hoverBorder: string;
    iconBox: string;
    btnHover: string;
  }
> = {
  emerald: {
    topLine: "via-emerald-400",
    hoverBorder: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]",
    iconBox: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    btnHover: "hover:border-emerald-400/60 hover:text-emerald-300",
  },
  amber: {
    topLine: "via-amber-400",
    hoverBorder: "hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]",
    iconBox: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    btnHover: "hover:border-amber-400/60 hover:text-amber-300",
  },
  violet: {
    topLine: "via-violet-400",
    hoverBorder: "hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.12)]",
    iconBox: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    btnHover: "hover:border-violet-400/60 hover:text-violet-300",
  },
  cyan: {
    topLine: "via-cyan-400",
    hoverBorder: "hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]",
    iconBox: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    btnHover: "hover:border-cyan-400/60 hover:text-cyan-300",
  },
  sky: {
    topLine: "via-sky-400",
    hoverBorder: "hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.12)]",
    iconBox: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    btnHover: "hover:border-sky-400/60 hover:text-sky-300",
  },
  blue: {
    topLine: "via-blue-400",
    hoverBorder: "hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]",
    iconBox: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    btnHover: "hover:border-blue-400/60 hover:text-blue-300",
  },
  indigo: {
    topLine: "via-indigo-400",
    hoverBorder: "hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]",
    iconBox: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    btnHover: "hover:border-indigo-400/60 hover:text-indigo-300",
  },
  rose: {
    topLine: "via-rose-400",
    hoverBorder: "hover:border-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.12)]",
    iconBox: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    btnHover: "hover:border-rose-400/60 hover:text-rose-300",
  },
};

function renderIcon(icon: ModuleCard["icon"]) {
  switch (icon) {
    case "results":
      return <FileSpreadsheet className="h-4 w-4" />;
    case "structure":
      return <Layers className="h-4 w-4" />;
    case "progression":
      return <TrendingUp className="h-4 w-4" />;
    case "codes":
      return <KeyRound className="h-4 w-4" />;
    case "notices":
      return <BellRing className="h-4 w-4" />;
    case "pending":
      return <FileCheck2 className="h-4 w-4" />;
    case "approved":
      return <BookOpen className="h-4 w-4" />;
    case "requests":
      return <UserCheck className="h-4 w-4" />;
    case "users":
      return <Users className="h-4 w-4" />;
    case "audit":
      return <ScrollText className="h-4 w-4" />;
    case "settings":
      return <Settings className="h-4 w-4" />;
  }
}

function ModuleGridCard({ item }: { item: ModuleCard }) {
  const styles = accentMap[item.accent];
  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${styles.hoverBorder}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${styles.topLine} to-transparent opacity-80 transition-opacity group-hover:opacity-100`}
      />

      <div>
        <div
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${styles.iconBox}`}
        >
          {renderIcon(item.icon)}
        </div>

        <h3 className="mt-4 font-serif text-base font-bold text-white">
          {item.title}
        </h3>

        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          {item.description}
        </p>
      </div>

      <div className="mt-5 pt-2">
        <Link
          href={item.href}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#060A12]/80 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all duration-150 hover:bg-slate-900 active:scale-95 ${styles.btnHover}`}
        >
          <span>{item.action}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  const serviceRole = createServiceRoleClient();
  const [reqRes, matRes, usersRes, noticesRes] = await Promise.all([
    serviceRole
      .from("administration_account_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    serviceRole
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    serviceRole
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    serviceRole
      .from("notices")
      .select("id", { count: "exact", head: true }),
  ]);

  const pendingRequests = reqRes.count ?? 0;
  const pendingMaterials = matRes.count ?? 0;
  const totalUsers = usersRes.count ?? 0;
  const publishedNotices = noticesRes.count ?? 0;

  async function handleSignOut() {
    "use server";

    const result = await signOut();

    if (result.success) {
      redirect("/staff-login");
    }
  }

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100 selection:bg-amber-500/30">
      {/* Subtle Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.18)]">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                  Super Admin
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">•</span>
                <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                  JTEC Academic Platform
                </span>
              </div>
              <h1 className="mt-0.5 font-serif text-xl font-bold tracking-tight text-white sm:text-2xl">
                Super Admin Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">
                {profile.full_name || "Super Administrator"}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-amber-400/80">
                Super Admin
              </p>
            </div>

            <Link
              href="/super-admin/profile"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-amber-300 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-400/75 hover:text-amber-200 hover:shadow-[0_0_20px_rgba(245,158,11,0.22)] active:translate-y-0 active:scale-95"
            >
              <UserCircle2 className="h-3.5 w-3.5 text-amber-400" />
              <span>My Profile</span>
            </Link>

            <form action={handleSignOut}>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-500/45 bg-gradient-to-b from-rose-500/25 to-rose-600/15 px-4 py-2 text-xs font-bold text-rose-200 shadow-[0_2px_12px_rgba(244,63,94,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-150 hover:-translate-y-0.5 hover:border-rose-400/80 hover:from-rose-500/35 hover:to-rose-600/25 hover:text-white hover:shadow-[0_0_22px_rgba(244,63,94,0.38)] active:translate-y-0 active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Top 4 Clickable Live KPI Stat Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/super-admin/account-requests"
            className="group block cursor-pointer rounded-2xl border border-emerald-500/35 bg-[#0A1020]/95 p-5 shadow-[0_0_25px_rgba(16,185,129,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/70 hover:shadow-[0_0_30px_rgba(16,185,129,0.18)]"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Pending Account Requests</span>
              <ChevronRight className="h-4 w-4 text-emerald-400/70 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-white">
              {pendingRequests}
            </p>
          </Link>

          <Link
            href="/admin/materials-review"
            className="group block cursor-pointer rounded-2xl border border-amber-500/35 bg-[#0A1020]/95 p-5 shadow-[0_0_25px_rgba(245,158,11,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/70 hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Pending Materials Review</span>
              <ChevronRight className="h-4 w-4 text-amber-400/70 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-white">
              {pendingMaterials}
            </p>
          </Link>

          <Link
            href="/super-admin/users"
            className="group block cursor-pointer rounded-2xl border border-violet-500/35 bg-[#0A1020]/95 p-5 shadow-[0_0_25px_rgba(139,92,246,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/70 hover:shadow-[0_0_30px_rgba(139,92,246,0.18)]"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Total Active Users</span>
              <ChevronRight className="h-4 w-4 text-violet-400/70 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-white">
              {totalUsers.toLocaleString()}
            </p>
          </Link>

          <Link
            href="/admin/notices"
            className="group block cursor-pointer rounded-2xl border border-sky-500/35 bg-[#0A1020]/95 p-5 shadow-[0_0_25px_rgba(56,189,248,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-[0_0_30px_rgba(56,189,248,0.18)]"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Published Notices</span>
              <ChevronRight className="h-4 w-4 text-sky-400/70 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-300" />
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-white">
              {publishedNotices}
            </p>
          </Link>
        </section>

        {/* Section 1: Academic & Results */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Academic &amp; Results
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {academicModules.map((item) => (
              <ModuleGridCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        {/* Section 2: Content & Communications */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Content &amp; Communications
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {contentModules.map((item) => (
              <ModuleGridCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        {/* Section 3: Governance & Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">
              Governance &amp; Security
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {governanceModules.map((item) => (
              <ModuleGridCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        {/* Slim Security Footer Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-[#0A1020]/80 px-4 py-3 text-xs text-slate-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-amber-300">
              Super Admin Access:
            </span>{" "}
            These controls are restricted to Super Admin accounts and enforced
            server-side via database Row Level Security (RLS).
          </p>
        </div>
      </main>
    </div>
  );
}