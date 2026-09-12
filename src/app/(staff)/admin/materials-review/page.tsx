import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import ReviewActions from "./ReviewActions";
import ReviewFileActions from "./ReviewFileActions";

export default async function MaterialsReviewPage() {
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
    !["super_admin", "admin"].includes(profile.role)
  ) {
    redirect("/staff-login");
  }

  const serviceSupabase = createServiceRoleClient();

  const { data: materials, error: materialsError } = await serviceSupabase
    .from("materials")
    .select(`
      id,
      title,
      description,
      topic,
      status,
      file_type,
      file_size_bytes,
      created_at,
      uploader_id,
      department_id,
      subject_id,
      file_path
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Staff Administration
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                Materials Review
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Review academic materials submitted by students.
              </p>
            </div>

            <Link href="/admin">
              <Button variant="outline">Back to Admin Dashboard</Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Pending Materials
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Materials waiting for staff review.
              </p>
            </div>

            <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
              {materials?.length ?? 0} pending
            </div>
          </div>

          {materialsError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Unable to load pending materials.
            </div>
          ) : !materials || materials.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium text-foreground">
                No pending materials
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                There are currently no materials waiting for review.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {materials.map((material) => (
                <article
                  key={material.id}
                  className="rounded-xl border border-border p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                          {Math.round(
                            material.file_size_bytes / 1024,
                          )}{" "}
                          KB
                        </span>

                        <span className="rounded-full border border-border px-2.5 py-1">
                          Pending
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <p className="text-xs text-muted-foreground">
                        Submitted
                      </p>

                      <p className="mt-1 text-sm text-foreground">
                        {new Date(material.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">
                      Material ID
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-foreground">
                      {material.id}
                    </p>
                  </div>

                  <ReviewFileActions
                    materialId={material.id}
                    fileType={material.file_type}
                  />

                  <ReviewActions materialId={material.id} />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

