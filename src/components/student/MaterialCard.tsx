import Link from "next/link";
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

function getDepartmentBadge(deptName?: string | null) {
  if (!deptName) return null;
  const t = deptName.toUpperCase();

  if (t.includes("APPAREL") || t.includes("AE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-purple-200/80 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        AE • Apparel
      </span>
    );
  }

  if (t.includes("WET") || t.includes("WPE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-200/80 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-300">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        WPE • Wet Process
      </span>
    );
  }

  if (t.includes("FABRIC") || t.includes("FE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        FE • Fabric
      </span>
    );
  }

  if (t.includes("YARN") || t.includes("YE")) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        YE • Yarn
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
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

  if (!normalizedQuery) {
    return <>{text}</>;
  }

  const words = normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  if (words.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = words.some(
          (word) => part.toLowerCase() === word.toLowerCase(),
        );

        return isMatch ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-primary/20 px-0.5 text-foreground"
          >
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
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold uppercase text-foreground">
          {material.file_type
            .replace("application/", "")
            .replace("text/", "")
            .slice(0, 4)}
        </div>

        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Approved
        </span>
      </div>

      <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-foreground">
        <HighlightText text={material.title} searchQuery={searchQuery} />
      </h2>

      {material.subject && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">
            Subject
          </p>

          <p className="text-sm font-medium text-foreground">
            {material.subject.subject_code} - {material.subject.subject_name}
          </p>
        </div>
      )}

      {material.topic && (
        <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
          Topic: <HighlightText text={material.topic} searchQuery={searchQuery} />
        </p>
      )}

      {material.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
          <HighlightText text={material.description} searchQuery={searchQuery} />
        </p>
      )}

      {material.uploader && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <UploaderContactProfile
              profile={material.uploader}
              materialId={material.id}
            />
          </div>
          {getDepartmentBadge(material.uploader.department_name)}
        </div>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Views: {material.views_count}</span>

          <span>Downloads: {material.downloads_count}</span>

          <span>Size: {formatFileSize(material.file_size_bytes)}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href={`/materials/${material.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
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