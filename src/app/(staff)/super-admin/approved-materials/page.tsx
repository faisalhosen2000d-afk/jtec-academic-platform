import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FolderCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import ApprovedMaterialsClient, {
  type ApprovedMaterialRow,
} from "./ApprovedMaterialsClient";

type ApprovedMaterial = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  uploader_id: string;
  subject_id: string;
  file_path: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default async function ApprovedMaterialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    redirect("/");
  }

  const serviceSupabase = createServiceRoleClient();

  const [materialsRes, subjectsRes, profilesRes] = await Promise.all([
    serviceSupabase
      .from("materials")
      .select(
        "id, title, description, topic, file_type, file_size_bytes, views_count, downloads_count, created_at, uploader_id, subject_id, file_path",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    serviceSupabase.from("subjects").select("id, subject_name, subject_code"),
    serviceSupabase.from("profiles").select("id, full_name"),
  ]);

  const materials = (materialsRes.data ?? []) as ApprovedMaterial[];
  const subjects = (subjectsRes.data ?? []) as Array<{
    id: string;
    subject_name: string;
    subject_code: string;
  }>;
  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
  }>;

  const subjectMap = new Map(
    subjects.map((s) => [s.id, s.subject_code ? `${s.subject_code} · ${s.subject_name}` : s.subject_name]),
  );
  const profileMap = new Map(
    profiles.map((p) => [p.id, p.full_name?.trim() || "Unknown User"]),
  );

  const enrichedMaterials: ApprovedMaterialRow[] = materials.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    topic: m.topic,
    file_type: m.file_type,
    file_size_bytes: m.file_size_bytes,
    views_count: m.views_count,
    downloads_count: m.downloads_count,
    created_at: m.created_at,
    subjectLabel: subjectMap.get(m.subject_id) ?? "General Subject",
    uploaderName: profileMap.get(m.uploader_id) ?? "Unknown Uploader",
  }));

  const totalViews = materials.reduce((sum, m) => sum + (m.views_count ?? 0), 0);
  const totalDownloads = materials.reduce(
    (sum, m) => sum + (m.downloads_count ?? 0),
    0,
  );
  const totalBytes = materials.reduce(
    (sum, m) => sum + (m.file_size_bytes ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)]">
                <FolderCheck className="h-3 w-3" />
                Approved Materials
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Approved Materials
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage materials that have already been approved and are available
              to students.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-emerald-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* 4 Live KPI Cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Approved Materials
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {materials.length}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Views
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-sky-300">
              {totalViews.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Downloads
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {totalDownloads.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Storage
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {formatFileSize(totalBytes)}
            </p>
          </div>
        </section>

        {materialsRes.error ? (
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6">
            <p className="text-sm font-semibold text-rose-300">
              Unable to load approved materials.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {materialsRes.error.message}
            </p>
          </div>
        ) : (
          <ApprovedMaterialsClient materials={enrichedMaterials} />
        )}

        {/* Slim RLS Footer */}
        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Storage &amp; Database Integrity:
            </span>{" "}
            Deleting a material permanently removes both its database record and
            uploaded file via server-side Super Admin verification.
          </p>
        </section>
      </main>
    </div>
  );
}