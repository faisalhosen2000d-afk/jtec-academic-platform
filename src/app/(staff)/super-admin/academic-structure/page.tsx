import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarRange,
  Layers,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const academicSections = [
  {
    title: "Departments",
    description:
      "Create, update, and manage the academic departments of JTEC.",
    href: "/super-admin/academic-structure/departments",
    action: "Manage Departments",
    accent: "amber",
    icon: "departments",
  },
  {
    title: "Batches",
    description:
      "Create and manage student batches used across the academic platform.",
    href: "/super-admin/academic-structure/batches",
    action: "Manage Batches",
    accent: "cyan",
    icon: "batches",
  },
  {
    title: "Levels",
    description:
      "Manage the four academic levels and progression structure of the program.",
    href: "/super-admin/academic-structure/levels",
    action: "Manage Levels",
    accent: "violet",
    icon: "levels",
  },
  {
    title: "Terms",
    description:
      "Manage academic terms and semester divisions under each level.",
    href: "/super-admin/academic-structure/terms",
    action: "Manage Terms",
    accent: "emerald",
    icon: "terms",
  },
  {
    title: "Subjects",
    description:
      "Manage subjects and their department, level, and term assignments.",
    href: "/super-admin/academic-structure/subjects",
    action: "Manage Subjects",
    accent: "sky",
    icon: "subjects",
  },
] as const;

const accentStyles = {
  amber: {
    topLine: "via-amber-400",
    kpiBorder: "border-amber-500/35 hover:border-amber-400/70 hover:shadow-[0_0_28px_rgba(245,158,11,0.16)]",
    cardHover: "hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]",
    iconBox: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    btnHover: "hover:border-amber-400/60 hover:text-amber-300",
    arrow: "text-amber-400/70 group-hover:text-amber-300",
  },
  cyan: {
    topLine: "via-cyan-400",
    kpiBorder: "border-slate-800/90 hover:border-cyan-400/65 hover:shadow-[0_0_28px_rgba(6,182,212,0.15)]",
    cardHover: "hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]",
    iconBox: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    btnHover: "hover:border-cyan-400/60 hover:text-cyan-300",
    arrow: "text-cyan-400/70 group-hover:text-cyan-300",
  },
  violet: {
    topLine: "via-violet-400",
    kpiBorder: "border-slate-800/90 hover:border-violet-400/65 hover:shadow-[0_0_28px_rgba(139,92,246,0.15)]",
    cardHover: "hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.12)]",
    iconBox: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    btnHover: "hover:border-violet-400/60 hover:text-violet-300",
    arrow: "text-violet-400/70 group-hover:text-violet-300",
  },
  emerald: {
    topLine: "via-emerald-400",
    kpiBorder: "border-slate-800/90 hover:border-emerald-400/65 hover:shadow-[0_0_28px_rgba(16,185,129,0.15)]",
    cardHover: "hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]",
    iconBox: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    btnHover: "hover:border-emerald-400/60 hover:text-emerald-300",
    arrow: "text-emerald-400/70 group-hover:text-emerald-300",
  },
  sky: {
    topLine: "via-sky-400",
    kpiBorder: "border-slate-800/90 hover:border-sky-400/65 hover:shadow-[0_0_28px_rgba(56,189,248,0.15)]",
    cardHover: "hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.12)]",
    iconBox: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    btnHover: "hover:border-sky-400/60 hover:text-sky-300",
    arrow: "text-sky-400/70 group-hover:text-sky-300",
  },
};

function renderSectionIcon(icon: (typeof academicSections)[number]["icon"]) {
  switch (icon) {
    case "departments":
      return <Building2 className="h-4 w-4" />;
    case "batches":
      return <Users className="h-4 w-4" />;
    case "levels":
      return <Layers className="h-4 w-4" />;
    case "terms":
      return <CalendarRange className="h-4 w-4" />;
    case "subjects":
      return <BookOpen className="h-4 w-4" />;
  }
}

export default async function AcademicStructurePage() {
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
    redirect("/");
  }

  const serviceRole = createServiceRoleClient();
  const [deptRes, batchRes, levelRes, termRes, subjRes] = await Promise.all([
    serviceRole.from("departments").select("id", { count: "exact", head: true }),
    serviceRole.from("batches").select("id", { count: "exact", head: true }),
    serviceRole.from("levels").select("id", { count: "exact", head: true }),
    serviceRole.from("terms").select("id", { count: "exact", head: true }),
    serviceRole.from("subjects").select("id", { count: "exact", head: true }),
  ]);

  const counts = {
    departments: deptRes.count ?? 0,
    batches: batchRes.count ?? 0,
    levels: levelRes.count ?? 0,
    terms: termRes.count ?? 0,
    subjects: subjRes.count ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.22)]">
                Academic Structure
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Academic Structure
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage departments, batches, levels, terms, and subjects across
              the JTEC Academic Platform.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* 5 Live Clickable Structure KPI Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {academicSections.map((sec) => {
            const styles = accentStyles[sec.accent];
            const count = counts[sec.icon];
            return (
              <Link
                key={sec.href}
                href={sec.href}
                className={`group block cursor-pointer rounded-2xl border bg-[#0A1020]/95 p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${styles.kpiBorder}`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>{sec.title}</span>
                  <ArrowRight
                    className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${styles.arrow}`}
                  />
                </div>
                <p className="mt-2.5 font-serif text-3xl font-bold text-white">
                  {count}
                </p>
              </Link>
            );
          })}
        </section>

        {/* Academic Management Modules */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Academic Management
            </h2>
            <p className="text-xs text-slate-400">
              Choose an academic structure component to configure.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {academicSections.map((section) => {
              const styles = accentStyles[section.accent];
              return (
                <div
                  key={section.href}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020]/95 p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${styles.cardHover}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${styles.topLine} to-transparent opacity-80 transition-opacity group-hover:opacity-100`}
                  />

                  <div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${styles.iconBox}`}
                      >
                        {renderSectionIcon(section.icon)}
                      </div>
                      <h3 className="font-serif text-lg font-bold text-white">
                        {section.title}
                      </h3>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {section.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-2">
                    <Link
                      href={section.href}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#060A12]/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all duration-150 hover:bg-slate-900 active:scale-95 ${styles.btnHover}`}
                    >
                      <span>{section.action}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}