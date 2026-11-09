import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  File,
  Eye,
  Download,
  HardDrive,
} from "lucide-react";
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

function getFileTypeBadge(fileType: string, title?: string) {
  const ft = (fileType || "").toLowerCase();
  const ext = title && title.includes(".") ? title.split(".").pop()?.toLowerCase() : "";

  if (ft.includes("pdf") || ext === "pdf") {
    return {
      label: "PDF",
      badgeClass: "bg-rose-50 text-rose-600 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60",
      icon: <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
    };
  }
  if (ft.includes("image") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")) {
    return {
      label: "IMAGE",
      badgeClass: "bg-purple-50 text-purple-600 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60",
      icon: <ImageIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
    };
  }
  if (ft.includes("word") || ft.includes("officedocument.word") || ["doc", "docx"].includes(ext || "")) {
    return {
      label: "WORD",
      badgeClass: "bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60",
      icon: <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    };
  }
  if (ft.includes("presentation") || ft.includes("powerpoint") || ["ppt", "pptx"].includes(ext || "")) {
    return {
      label: "SLIDES",
      badgeClass: "bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60",
      icon: <Presentation className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
    };
  }
  if (ft.includes("sheet") || ft.includes("excel") || ["xls", "xlsx", "csv"].includes(ext || "")) {
    return {
      label: "EXCEL",
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60",
      icon: <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
    };
  }
  return {
    label: "DOC",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
    icon: <File className="h-3.5 w-3.5 text-slate-500" />
  };
}

function getDepartmentBadge(deptName?: string | null) {
  if (!deptName) return null;
  const t = deptName.toUpperCase();

  if (t.includes("APPAREL") || t.includes("AE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-purple-200/90 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        AE • Apparel
      </span>
    );
  }

  if (t.includes("WET") || t.includes("WPE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-200/90 bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        WPE • Wet Process
      </span>
    );
  }

  if (t.includes("FABRIC") || t.includes("FE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        FE • Fabric
      </span>
    );
  }

  if (t.includes("YARN") || t.includes("YE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        YE • Yarn
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {deptName}
    </span>
  );
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
  const fileBadge = getFileTypeBadge(material.file_type, material.title);

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        {/* Top Header: Dynamic File Type Icon Badge & Status */}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${fileBadge.badgeClass}`}
          >
            {fileBadge.icon}
            <span>{fileBadge.label}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Approved
          </span>
        </div>

        {/* Title */}
        <h2 className="mt-3.5 line-clamp-2 text-base font-bold text-foreground">
          <HighlightText text={material.title} searchQuery={searchQuery} />
        </h2>

        {/* Subject & Topic Capsule Box */}
        {material.subject && (
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Subject
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-foreground">
              {material.subject.subject_code} - {material.subject.subject_name}
            </p>
            {material.topic && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">Topic:</span>{" "}
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
      <div className="mt-4 pt-1">
        {/* Uploader Profile with Signature Department Badge */}
        {material.uploader && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <UploaderContactProfile
                profile={material.uploader}
                materialId={material.id}
                departmentName={material.uploader.department_name}
              />
            </div>
            {getDepartmentBadge(material.uploader.department_name)}
          </div>
        )}

        {/* Meta Stats Bar with Icons */}
        <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <Eye className="h-3.5 w-3.5 opacity-70" /> {material.views_count} Views
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
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98]"
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