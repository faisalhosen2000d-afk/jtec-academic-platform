import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import ReviewActions from "./ReviewActions";
import ReviewFileActions from "./ReviewFileActions";
import {
  ArrowLeft,
  FileCheck2,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

type GenericRow = Record<string, unknown>;

function formatFileType(raw: string | null): string {
  if (!raw) return "FILE";
  const lower = raw.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("presentation") || lower.includes("powerpoint") || lower.includes("ppt")) return "PPTX";
  if (lower.includes("wordprocessing") || lower.includes("msword") || lower.includes("doc")) return "DOCX";
  if (lower.includes("spreadsheet") || lower.includes("excel") || lower.includes("xls")) return "XLSX";
  if (lower.includes("image")) return "IMG";
  return raw.split("/").pop()?.toUpperCase().slice(0, 8) || "FILE";
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export default async function AdminMaterialsReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !["super_admin", "admin", "moderator"].includes(profile.role)
  ) {
    redirect("/staff-login");
  }

  const serviceRole = createServiceRoleClient();

  const [
    pendingRes,
    approvedCountRes,
    rejectedCountRes,
    subjectsRes,
    deptsRes,
    levelsRes,
    termsRes,
  ] = await Promise.all([
    supabase
      .from("materials")
      .select(
        "id, title, description, topic, status, file_type, file_size_bytes, created_at, uploader_id, department_id, subject_id"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    serviceRole
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    serviceRole
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    serviceRole.from("subjects").select("id, subject_code, subject_name, department_id, level_id, term_id"),
    serviceRole.from("departments").select("id, name, code"),
    serviceRole.from("levels").select("id, name"),
    serviceRole.from("terms").select("id, name"),
  ]);

  const materials = pendingRes.data || [];
  const materialsError = pendingRes.error;
  const approvedCount = approvedCountRes.count ?? 0;
  const rejectedCount = rejectedCountRes.count ?? 0;

  // Fetch uploader names & rolls
  const uploaderIds = Array.from(
    new Set(materials.map((m) => m.uploader_id).filter(Boolean))
  );
  const uploaderMap = new Map<string, { full_name: string; student_id: string | null }>();
  if (uploaderIds.length > 0) {
    const { data: uploaders } = await serviceRole
      .from("profiles")
      .select("id, full_name, student_id")
      .in("id", uploaderIds);
    ((uploaders || []) as GenericRow[]).forEach((u) => {
      uploaderMap.set(String(u.id), {
        full_name: String(u.full_name || "Student"),
        student_id: u.student_id ? String(u.student_id) : null,
      });
    });
  }

  const deptMap = new Map<string, { code: string; name: string }>();
  ((deptsRes.data || []) as GenericRow[]).forEach((d) => {
    deptMap.set(String(d.id), {
      code: String(d.code || d.name || "GEN"),
      name: String(d.name || ""),
    });
  });

  const levelMap = new Map<string, string>();
  ((levelsRes.data || []) as GenericRow[]).forEach((l) => {
    levelMap.set(String(l.id), String(l.name || ""));
  });

  const termMap = new Map<string, string>();
  ((termsRes.data || []) as GenericRow[]).forEach((t) => {
    termMap.set(String(t.id), String(t.name || ""));
  });

  const subjMap = new Map<string, GenericRow>();
  ((subjectsRes.data || []) as GenericRow[]).forEach((s) => {
    subjMap.set(String(s.id), s);
  });

  const backHref = profile.role === "super_admin" ? "/super-admin" : "/admin";
  const backLabel =
    profile.role === "super_admin"
      ? "Back to Super Admin"
      : "Back to Admin Console";

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-400">
                <FileCheck2 className="h-3 w-3" />
                Coursework Moderation
              </span>
              <span className="text-xs text-slate-400">
                Staff Administration
              </span>
            </div>
            <h1 className="mt-1 font-serif text-xl font-bold text-white sm:text-2xl">
              Materials Review Queue
            </h1>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-sky-500/50 hover:text-sky-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        {/* Live Summary Strip */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0A1020] px-5 py-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold">
            <span className="inline-flex items-center gap-2 text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              {materials.length} Pending Submissions
            </span>
            <span className="inline-flex items-center gap-2 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {approvedCount} Approved Total
            </span>
            <span className="inline-flex items-center gap-2 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              {rejectedCount} Rejected
            </span>
          </div>

          <Link
            href="/admin/materials-library"
            className="text-xs font-semibold text-sky-400 transition-colors hover:text-sky-300"
          >
            View Approved Library →
          </Link>
        </section>

        {/* Review Queue Content */}
        {materialsError ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Unable to load pending materials right now.</span>
          </div>
        ) : materials.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0A1020] p-14 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-white">
              All Caught Up!
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              There are currently no student-submitted materials waiting for review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {materials.map((material) => {
              const subj = material.subject_id
                ? subjMap.get(String(material.subject_id))
                : undefined;
              const deptId = material.department_id || subj?.department_id;
              const dept = deptId ? deptMap.get(String(deptId)) : undefined;
              const lvl = subj?.level_id ? levelMap.get(String(subj.level_id)) : "";
              const trm = subj?.term_id ? termMap.get(String(subj.term_id)) : "";
              const uploader = material.uploader_id
                ? uploaderMap.get(String(material.uploader_id))
                : undefined;

              return (
                <article
                  key={material.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all hover:border-sky-500/40"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />

                  <div>
                    {/* Badges Top Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        <Clock className="h-3 w-3" />
                        {dept?.code || "DEPT"} {lvl || trm ? `• ${lvl} ${trm}` : "• Pending"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                        <FileText className="h-3 w-3 text-sky-400" />
                        {formatFileType(material.file_type)} •{" "}
                        {formatSize(material.file_size_bytes)}
                      </span>
                    </div>

                    {/* Title & Subject */}
                    <h3 className="mt-4 font-serif text-lg font-bold text-white">
                      {material.title}
                    </h3>
                    {subj && (
                      <p className="mt-1 text-xs font-semibold text-amber-400">
                        {String(subj.subject_code || "")} —{" "}
                        {String(subj.subject_name || "")}
                      </p>
                    )}

                    {material.topic && (
                      <p className="mt-2 text-xs text-slate-300">
                        <span className="font-semibold text-slate-400">Topic:</span>{" "}
                        {material.topic}
                      </p>
                    )}

                    {material.description && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-3">
                        {material.description}
                      </p>
                    )}

                    {/* Uploader & Date */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-slate-200 font-medium">
                          {uploader?.full_name || "Student"}
                        </span>
                        {uploader?.student_id && (
                          <span className="text-slate-500">
                            (Roll: {uploader.student_id})
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(material.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Bar (Preserves existing ReviewFileActions & ReviewActions) */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                    <ReviewFileActions
                      materialId={material.id}
                      fileType={material.file_type}
                    />
                    <ReviewActions materialId={material.id} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}