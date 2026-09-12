import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import MaterialFileActions from "./MaterialFileActions";

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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">

              {/* Page Header */}
              <section>
                <Link
                  href="/materials"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Materials
                </Link>

                <p className="mt-5 text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Material Details
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  View information about this academic material.
                </p>
              </section>

              {/* Material Details */}
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="flex flex-col gap-6">

                  {/* Top Section */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold uppercase text-foreground">
                        {formatFileType(materialData.file_type).slice(0, 4)}
                      </div>

                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {materialData.title}
                        </h2>

                        <span className="mt-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          Approved
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  {materialData.subject && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Subject
                      </p>

                      <p className="mt-1 text-sm font-medium text-foreground">
                        {materialData.subject.subject_code} —{" "}
                        {materialData.subject.subject_name}
                      </p>
                    </div>
                  )}

                  {/* Topic */}
                  {materialData.topic && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Topic
                      </p>

                      <p className="mt-1 text-sm text-foreground">
                        {materialData.topic}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {materialData.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Description
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {materialData.description}
                      </p>
                    </div>
                  )}

                  {/* File Information */}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      File Information
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          File Type
                        </p>

                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatFileType(materialData.file_type)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          File Size
                        </p>

                        <p className="mt-1 text-sm font-medium text-foreground">
                          {formatFileSize(materialData.file_size_bytes)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          Added
                        </p>

                        <p className="mt-1 text-sm font-medium text-foreground">
                          {new Date(
                            materialData.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Statistics
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          Views
                        </p>

                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {materialData.views_count}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground">
                          Downloads
                        </p>

                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {materialData.downloads_count}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Actions */}
                  <div className="border-t border-border pt-5">
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