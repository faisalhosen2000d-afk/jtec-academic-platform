import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

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

export default async function MaterialsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: materials, error } = await supabase
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
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
  console.error("Materials loading error:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  throw new Error(
    `Materials loading failed: ${error.message}`
  );
}

  const materialList: Material[] = (materials ?? []).map((material) => ({
    ...material,
    subject: Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject,
  }));

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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              
              {/* Page Header */}
              <section>
                <p className="text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Academic Materials
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Browse approved academic materials available to you.
                </p>
              </section>

              {/* Materials Count */}
              <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Available Materials
                </p>

                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {materialList.length}
                </p>
              </section>

              {/* Materials */}
              {materialList.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border bg-background p-12 text-center">
                  <div className="mx-auto max-w-md">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl">
                      📚
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-foreground">
                      No materials available
                    </h2>

                    <p className="mt-2 text-sm text-muted-foreground">
                      There are no approved academic materials available
                      right now.
                    </p>
                  </div>
                </section>
              ) : (
                <section>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {materialList.map((material) => (
                      <article
                        key={material.id}
                        className="flex h-full flex-col rounded-xl border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        {/* File Type */}
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

                        {/* Title */}
                        <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-foreground">
                          {material.title}
                        </h2>

                        {/* Subject */}
                        {material.subject && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Subject
                            </p>

                            <p className="text-sm font-medium text-foreground">
                              {material.subject.subject_code} —{" "}
                              {material.subject.subject_name}
                            </p>
                          </div>
                        )}

                        {/* Topic */}
                        {material.topic && (
                          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                            Topic: {material.topic}
                          </p>
                        )}

                        {/* Description */}
                        {material.description && (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {material.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="mt-auto pt-5">
                          <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                            <span>
                              👁 {material.views_count}
                            </span>

                            <span>
                              ↓ {material.downloads_count}
                            </span>

                            <span>
                              {formatFileSize(material.file_size_bytes)}
                            </span>
                          </div>

                          {/* Details Button */}
                          <Link
                            href={`/materials/${material.id}`}
                            className="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                          >
                            View Material
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}