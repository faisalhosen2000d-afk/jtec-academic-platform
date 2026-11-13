import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MaterialFileActions from "./MaterialFileActions";
import MaterialBookmarkButton from "./MaterialBookmarkButton";
import MaterialRating from "@/components/materials/MaterialRating";

type Material = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  subject: {
    subject_code: string;
    subject_name: string;
  } | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatFileType(fileType: string) {
  if (fileType.includes("/")) {
    return fileType.split("/").pop()?.toUpperCase() ?? "FILE";
  }

  return fileType.toUpperCase();
}

export default async function MaterialDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: material, error } = await supabase
    .from("materials")
    .select(`
      id,
      title,
      description,
      topic,
      file_type,
      file_size_bytes,
      views_count,
      downloads_count,
      created_at,
      subject:subjects (
        subject_code,
        subject_name
      )
    `)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("Material details loading error:", error);
  }

  if (!material) {
    notFound();
  }

  const materialData: Material = {
    ...material,
    subject: Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject,
  };

  const { data: existingBookmark, error: bookmarkError } = await supabase
    .from("material_bookmarks")
    .select("id")
    .eq("material_id", materialData.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (bookmarkError) {
    console.error("Material bookmark status loading error:", bookmarkError);
  }

  const isBookmarked = Boolean(existingBookmark);

  const { data: ratingStats, error: ratingStatsError } = await supabase.rpc(
    "get_material_rating_stats",
    {
      p_material_id: materialData.id,
    }
  );

  if (ratingStatsError) {
    console.error("Material rating stats loading error:", ratingStatsError);
  }

  const { data: existingRating, error: ratingError } = await supabase
    .from("material_ratings")
    .select("stars")
    .eq("material_id", materialData.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (ratingError) {
    console.error("Material rating loading error:", ratingError);
  }

  const ratingStatsData = Array.isArray(ratingStats)
    ? ratingStats[0]
    : ratingStats;

  const averageRating = Number(ratingStatsData?.average_rating ?? 0);
  const ratingCount = Number(ratingStatsData?.rating_count ?? 0);
  const initialRating = existingRating?.stars ?? null;

  const shortType = formatFileType(materialData.file_type).slice(0, 4);

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.35s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.35s ease-out 0.06s both; }
        .dash-stagger-3 { animation: dashFadeUp 0.35s ease-out 0.12s both; }
        @media (prefers-reduced-motion: reduce) {
          .dash-stagger-1, .dash-stagger-2, .dash-stagger-3 { animation: none; }
        }
      `}</style>

      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {/* Top Navigation & Bookmark */}
              <div className="dash-stagger-1 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/materials"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800/90 bg-[#0A1020] px-3.5 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-[#0E172A] hover:text-cyan-300"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to Materials
                </Link>

                <MaterialBookmarkButton
                  materialId={materialData.id}
                  initialBookmarked={isBookmarked}
                />
              </div>

              {/* Material Details Card */}
              <section className="dash-stagger-2 relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-7 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.9)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                <div className="flex flex-col gap-6">
                  {/* Top Header */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-xs font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_24px_-8px_rgba(34,211,238,0.45)]">
                      {shortType}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Approved
                        </span>

                        {materialData.subject && (
                          <span className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                            {materialData.subject.subject_code}
                          </span>
                        )}
                      </div>

                      <h1 className="mt-2.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-50">
                        {materialData.title}
                      </h1>
                    </div>
                  </div>

                  {/* Subject & Topic */}
                  {(materialData.subject || materialData.topic) && (
                    <div className={`grid gap-3 ${materialData.subject && materialData.topic ? "sm:grid-cols-2" : ""}`}>
                      {materialData.subject && (
                        <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Subject
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-slate-100">
                            {materialData.subject.subject_code} &mdash;{" "}
                            {materialData.subject.subject_name}
                          </p>
                        </div>
                      )}

                      {materialData.topic && (
                        <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Topic
                          </p>
                          <p className="mt-1.5 text-sm font-medium text-slate-100">
                            {materialData.topic}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {materialData.description && (
                    <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/50 p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Description
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {materialData.description}
                      </p>
                    </div>
                  )}

                  {/* File Information */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      File Information
                    </p>

                    <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700">
                        <p className="text-xs text-slate-400">File Type</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatFileType(materialData.file_type)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700">
                        <p className="text-xs text-slate-400">File Size</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatFileSize(materialData.file_size_bytes)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800/80 bg-[#0E172A]/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700">
                        <p className="text-xs text-slate-400">Added</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {new Date(materialData.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Statistics */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Engagement
                    </p>

                    <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#0E172A]/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30">
                        <div>
                          <p className="text-xs text-slate-400">Total Views</p>
                          <p className="mt-1 text-xl font-bold text-cyan-300">
                            {materialData.views_count}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-[#0E172A]/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30">
                        <div>
                          <p className="text-xs text-slate-400">Total Downloads</p>
                          <p className="mt-1 text-xl font-bold text-emerald-300">
                            {materialData.downloads_count}
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="dash-stagger-3">
                    <MaterialRating
                      materialId={materialData.id}
                      initialRating={initialRating}
                      averageRating={averageRating}
                      ratingCount={ratingCount}
                    />
                  </div>

                  {/* File Actions */}
                  <div className="dash-stagger-3 border-t border-slate-800/80 pt-5">
                    <MaterialFileActions
                      materialId={materialData.id}
                      fileType={materialData.file_type}
                    />
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