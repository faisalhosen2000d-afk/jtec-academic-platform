import Link from "next/link";
import { FileText, Eye, Download, HardDrive } from "lucide-react";
import UploaderContactProfile from "@/components/student/UploaderContactProfile";
import MaterialBookmarkButton from "@/app/(student)/materials/[id]/MaterialBookmarkButton";

type MaterialCardData = {
  id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  uploader: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    telegram: string | null;
    department?: { name: string; code?: string } | null;
    department_name?: string | null;
  } | null;
  subject: {
    subject_code: string;
    subject_name: string;
  } | null;
};

type MaterialCardProps = {
  material: MaterialCardData;
  searchQuery?: string;
  initialBookmarked: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface DepartmentBadgeConfig {
  code: string;
  shortName: string;
  fullName: string;
  badgeClass: string;
  dotClass: string;
}

function getDepartmentBadge(
  uploaderDeptName?: string | null,
  subjectCode?: string | null
): DepartmentBadgeConfig {
  const text = `${uploaderDeptName || ""} ${subjectCode || ""}`.toUpperCase();

  if (text.includes("APPAREL") || text.includes("AE ") || text.includes("AE-") || text.includes("AE/")) {
    return {
      code: "AE",
      shortName: "AE • Apparel",
      fullName: "Apparel Engineering",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200/90 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
      dotClass: "bg-purple-500",
    };
  }

  if (text.includes("WET") || text.includes("WPE ") || text.includes("WPE-") || text.includes("WPE/")) {
    return {
      code: "WPE",
      shortName: "WPE • Wet Process",
      fullName: "Wet Process Engineering",
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200/90 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60",
      dotClass: "bg-cyan-500",
    };
  }

  if (text.includes("FABRIC") || text.includes("FE ") || text.includes("FE-") || text.includes("FE/")) {
    return {
      code: "FE",
      shortName: "FE • Fabric",
      fullName: "Fabric Engineering",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      dotClass: "bg-emerald-500",
    };
  }

  if (text.includes("YARN") || text.includes("YE ") || text.includes("YE-") || text.includes("YE/")) {
    return {
      code: "YE",
      shortName: "YE • Yarn",
      fullName: "Yarn Engineering",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      dotClass: "bg-amber-500",
    };
  }

  return {
    code: "JTEC",
    shortName: "JTEC Textile",
    fullName: "Textile Engineering",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200/90 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800/60",
    dotClass: "bg-slate-500",
  };
}

function HighlightText({
  text,
  searchQuery,
}: {
  text: string;
  searchQuery?: string;
}) {
  const normalizedQuery = searchQuery?.trim() ?? "";
  if (!normalizedQuery) return <>{text}</>;

  const words = normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (words.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = words.some((w) => part.toLowerCase() === w.toLowerCase());
        return isMatch ? (
          <mark key={`${part}-${index}`} className="rounded bg-primary/20 px-0.5 text-foreground font-semibold">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

export default function MaterialCard({
  material,
  searchQuery,
  initialBookmarked,
}: MaterialCardProps) {
  const cleanFileType = material.file_type
    .replace("application/", "")
    .replace("text/", "")
    .slice(0, 4)
    .toUpperCase();

  const isPdf = cleanFileType === "PDF";
  const dept = getDepartmentBadge(
    material.uploader?.department?.name || material.uploader?.department_name,
    material.subject?.subject_code
  );

  return (
    <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
      {/* Subtle hover gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-muted/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div>
        {/* Top Header: File type & Status */}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
              isPdf
                ? "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5 opacity-80" />
            <span>{cleanFileType}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Approved
          </span>
        </div>

        {/* Title */}
        <h2 className="mt-3.5 line-clamp-2 text-base font-bold text-foreground transition-colors group-hover:text-primary">
          <HighlightText text={material.title} searchQuery={searchQuery} />
        </h2>

        {/* Subject & Topic Container */}
        {material.subject && (
          <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 p-2.5 transition-colors group-hover:bg-muted/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Subject
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-foreground">
              {material.subject.subject_code} - {material.subject.subject_name}
            </p>
            {material.topic && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Topic:</span>{" "}
                <HighlightText text={material.topic} searchQuery={searchQuery} />
              </p>
            )}
          </div>
        )}

        {/* Description */}
        {material.description && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            <HighlightText text={material.description} searchQuery={searchQuery} />
          </p>
        )}
      </div>

      {/* Bottom Section: Uploader & Meta Stats & Actions */}
      <div className="mt-4 pt-2">
        {/* Uploader Profile with Signature Department Badge */}
        {material.uploader && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/60 p-2">
            <div className="min-w-0 flex-1">
              <UploaderContactProfile
                profile={material.uploader}
                materialId={material.id}
              />
            </div>
            {/* Signature Department Badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${dept.badgeClass}`}
              title={dept.fullName}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dept.dotClass}`} />
              {dept.shortName}
            </span>
          </div>
        )}

        {/* Meta Stats Bar */}
        <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <Eye className="h-3.5 w-3.5 opacity-70" /> {material.views_count}
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <Download className="h-3.5 w-3.5 opacity-70" /> {material.downloads_count}
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <HardDrive className="h-3.5 w-3.5 opacity-70" /> {formatFileSize(material.file_size_bytes)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <Link
            href={`/materials/${material.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow active:scale-95"
          >
            View Material
          </Link>

          <MaterialBookmarkButton
            materialId={material.id}
            initialBookmarked={initialBookmarked}
          />
        </div>
      </div>
    </article>
  );
}