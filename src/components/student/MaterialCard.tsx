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
  ArrowUpRight,
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
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileTypeBadge(fileType: string, title?: string) {
  const ft = (fileType || "").toLowerCase();
  const ext =
    title && title.includes(".") ? title.split(".").pop()?.toLowerCase() : "";

  if (ft.includes("pdf") || ext === "pdf") {
    return {
      label: "PDF",
      badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-300",
      icon: <FileText className="h-3.5 w-3.5 text-rose-400" />,
    };
  }
  if (
    ft.includes("image") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "")
  ) {
    return {
      label: "IMAGE",
      badgeClass: "border-violet-500/40 bg-violet-500/15 text-violet-300",
      icon: <ImageIcon className="h-3.5 w-3.5 text-violet-400" />,
    };
  }
  if (
    ft.includes("word") ||
    ft.includes("officedocument.word") ||
    ["doc", "docx"].includes(ext || "")
  ) {
    return {
      label: "DOCX",
      badgeClass: "border-sky-500/40 bg-sky-500/15 text-sky-300",
      icon: <FileText className="h-3.5 w-3.5 text-sky-400" />,
    };
  }
  if (
    ft.includes("presentation") ||
    ft.includes("powerpoint") ||
    ["ppt", "pptx"].includes(ext || "")
  ) {
    return {
      label: "PPTX",
      badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-300",
      icon: <Presentation className="h-3.5 w-3.5 text-amber-400" />,
    };
  }
  if (
    ft.includes("sheet") ||
    ft.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext || "")
  ) {
    return {
      label: "XLSX",
      badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
      icon: <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />,
    };
  }
  return {
    label: "DOC",
    badgeClass: "border-slate-700 bg-slate-900 text-slate-300",
    icon: <File className="h-3.5 w-3.5 text-slate-400" />,
  };
}

function getDepartmentBadge(deptName?: string | null) {
  if (!deptName) return null;
  const t = deptName.toUpperCase();

  if (t.includes("APPAREL") || t.includes("AE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        AE · Apparel
      </span>
    );
  }

  if (t.includes("WET") || t.includes("WPE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        WPE · Wet Process
      </span>
    );
  }

  if (t.includes("YARN") || t.includes("YE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        YE · Yarn
      </span>
    );
  }

  if (t.includes("FABRIC") || t.includes("FE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        FE · Fabric
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
      {deptName}
    </span>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-amber-500/30 px-0.5 text-amber-200"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function MaterialCard({
  material,
  searchQuery = "",
  initialBookmarked,
}: MaterialCardProps) {
  const badge = getFileTypeBadge(material.file_type, material.title);

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 sm:p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/45 hover:bg-[#0D162B] hover:shadow-[0_14px_34px_rgba(16,185,129,0.12)]">
      <div>
        {/* Top Row: File Badge + Subject Pill + Bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}
            >
              {badge.icon}
              {badge.label}
            </span>
            {material.subject && (
              <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                {material.subject.subject_code}
              </span>
            )}
          </div>

          <MaterialBookmarkButton
            materialId={material.id}
            initialBookmarked={initialBookmarked}
            variant="icon"
          />
        </div>

        {/* Title & Subject Name */}
        <Link
          href={`/materials/${material.id}`}
          prefetch={true}
          className="mt-3 block transition-colors group-hover:text-emerald-300"
        >
          <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-white transition-colors group-hover:text-emerald-200">
            <HighlightText text={material.title} query={searchQuery} />
          </h3>
        </Link>

        {material.subject && (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">
            {material.subject.subject_name}
          </p>
        )}

        {/* Description / Topic */}
        {(material.topic || material.description) && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {material.topic && (
              <span className="font-semibold text-slate-200">
                <HighlightText text={material.topic} query={searchQuery} />
                {material.description ? " · " : ""}
              </span>
            )}
            {material.description && (
              <HighlightText text={material.description} query={searchQuery} />
            )}
          </p>
        )}
      </div>

      {/* Footer: Uploader + Icon Stats + Open */}
      <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-3.5">
        {material.uploader && (
          <div className="flex min-w-0 items-center justify-between gap-2">
            <UploaderContactProfile
              profile={material.uploader}
              materialId={material.id}
              departmentName={material.uploader.department_name}
            />
            {getDepartmentBadge(material.uploader.department_name)}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center gap-1" title="Views">
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-medium text-slate-200">
                {material.views_count}
              </span>
            </span>
            <span className="inline-flex items-center gap-1" title="Downloads">
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-slate-200">
                {material.downloads_count}
              </span>
            </span>
            <span className="inline-flex items-center gap-1" title="File Size">
              <HardDrive className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-medium text-slate-200">
                {formatFileSize(material.file_size_bytes)}
              </span>
            </span>
          </div>

          <Link
            href={`/materials/${material.id}`}
          prefetch={true}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500 hover:text-slate-950 active:scale-95"
          >
            <span>Open</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}