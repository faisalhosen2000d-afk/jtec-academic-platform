import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import DeleteApprovedMaterialButton from "./DeleteApprovedMaterialButton";

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

  const { data, error } = await serviceSupabase
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
      uploader_id,
      subject_id,
      file_path
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const materials = (data ?? []) as ApprovedMaterial[];

  return (
    <main className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Super Admin
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Approved Materials
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage materials that have already been approved and are
                available to students.
              </p>
            </div>

            <Link href="/super-admin">
              <Button variant="outline">Back to Super Admin</Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Approved Materials
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Only Super Admin can manage deletion of these materials.
              </p>
            </div>

            <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
              {materials.length} approved
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to load approved materials.
            </div>
          ) : materials.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium text-foreground">
                No approved materials
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                There are currently no approved materials.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-xl border border-border p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">
                        {material.title}
                      </h3>

                      {material.topic && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Topic: {material.topic}
                        </p>
                      )}

                      {material.description && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {material.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-2.5 py-1">
                          {material.file_type}
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          {formatFileSize(material.file_size_bytes)}
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          {material.views_count} views
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          {material.downloads_count} downloads
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          Approved
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-sm text-muted-foreground">
                      {new Date(material.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Material ID
                      </p>

                      <p className="mt-1 break-all font-mono text-xs text-foreground">
                        {material.id}
                      </p>
                    </div>

                    <DeleteApprovedMaterialButton materialId={material.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
