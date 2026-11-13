import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { getAcademicTermNavigation } from "@/lib/academic-terms";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck2,
  HardDrive,
  UploadCloud,
} from "lucide-react";
import UploadForm from "./UploadForm";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, current_level_id, current_term_id")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.department_id ||
    !profile.current_level_id ||
    !profile.current_term_id
  ) {
    redirect("/dashboard");
  }

  const rawServiceSupabase = createRawSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const [levelsResult, termsResult, { data: settingsData }] = await Promise.all([
    supabase.from("levels").select("id, name, sort_order").order("sort_order"),
    supabase.from("terms").select("id, level_id, name, sort_order").order("sort_order"),
    rawServiceSupabase.rpc("get_platform_settings"),
  ]);

  const maxUploadSizeMb =
    (settingsData as { max_upload_size_mb?: number } | null)?.max_upload_size_mb ?? 100;

  const termNavigation = getAcademicTermNavigation(
    levelsResult.data ?? [],
    termsResult.data ?? [],
    profile.current_level_id,
    profile.current_term_id,
  );

  if (!termNavigation) {
    console.error("[upload] Invalid current academic assignment.");
    redirect("/dashboard");
  }

  const allowedTerms = termNavigation.currentAndPreviousTerms;
  const allowedTermIds = allowedTerms.map((term) => term.id);

  const termOptions = allowedTerms.map((term) => {
    const level = (levelsResult.data ?? []).find(
      (item) => item.id === term.level_id,
    );

    return {
      id: term.id,
      label: `${level?.name ?? "Level"} - ${term.name}`,
    };
  });

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, subject_code, subject_name, department_id, level_id, term_id")
    .eq("department_id", profile.department_id)
    .in("term_id", allowedTermIds)
    .order("subject_code", { ascending: true });

  if (subjectsError) {
    console.error("[upload][subjects]", subjectsError);
  }

  const subjectsWithTermLabels = (subjects ?? []).map((subject) => {
    const level = (levelsResult.data ?? []).find(
      (item) => item.id === subject.level_id,
    );
    const term = (termsResult.data ?? []).find(
      (item) => item.id === subject.term_id,
    );

    return {
      ...subject,
      level_name: level?.name ?? "Level",
      term_name: term?.name ?? "Term",
    };
  });

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
      `}</style>
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-3xl space-y-5">
              {/* Compact Contribute Hero */}
              <section className="dash-stagger-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#091922] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_32px_rgba(6,182,212,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                        <UploadCloud className="h-3 w-3" />
                        Contribute
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
                        <HardDrive className="h-3 w-3 text-cyan-400" />
                        Max {maxUploadSizeMb} MB
                      </span>
                    </div>

                    <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Upload Material
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      Share lecture notes, slides, and question banks with your batch.
                    </p>
                  </div>

                  <Link
                    href="/materials"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E172A] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-300"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Materials
                  </Link>
                </div>
              </section>

              {/* Compact Upload Form Card */}
              <section className="dash-stagger-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl">
                {subjectsError ? (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    Unable to load subjects. Please try again.
                  </p>
                ) : (
                  <UploadForm
                    subjects={subjectsWithTermLabels}
                    terms={termOptions}
                    currentTermId={profile.current_term_id}
                    maxUploadSizeMb={maxUploadSizeMb}
                  />
                )}
              </section>

              {/* Compact Process & Guidelines Card */}
              <section className="dash-stagger-3 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 shadow-lg">
                <h2 className="font-serif text-sm font-bold text-white">
                  Upload Process &amp; Guidelines
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800/80 bg-[#0E172A] p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <FileCheck2 className="h-4 w-4 shrink-0" />
                      1. Required Fields
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                      <span className="text-slate-200">Subject</span>,{" "}
                      <span className="text-slate-200">Material Title</span>, and{" "}
                      <span className="text-slate-200">File</span> are required.
                      Topic &amp; Description are optional.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#0E172A] p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <Clock className="h-4 w-4 shrink-0" />
                      2. Review Queue
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                      After submission, your file enters{" "}
                      <span className="text-slate-200">Pending Review</span>{" "}
                      and waits for admin or moderator verification.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#0E172A] p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      3. Approval &amp; Live
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                      Once approved, it publishes to{" "}
                      <span className="text-slate-200">Study Vault</span> and
                      you&apos;ll receive a status notification.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}