import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import BookmarksFilter from "@/components/student/BookmarksFilter";
type BookmarkMaterial = {
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
  } | null;
  subject: {
    subject_code: string;
    subject_name: string;
  } | null;
};

export default async function BookmarksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("department_id, current_level_id, current_term_id")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.department_id ||
    !profile.current_level_id ||
    !profile.current_term_id
  ) {
    redirect("/dashboard");
  }

  const { data: currentTermSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, subject_code, subject_name, level_id, term_id")
    .eq("department_id", profile.department_id)
    .eq("level_id", profile.current_level_id)
    .eq("term_id", profile.current_term_id)
    .order("subject_code", { ascending: true });

  if (subjectsError) {
    console.error("[bookmarks][subjects]", subjectsError);
  }


  const { data: bookmarks, error } = await supabase
    .from("material_bookmarks")
    .select(`
      id,
      created_at,
      material:materials!material_bookmarks_material_id_fkey (
        id,
        uploader_id,
        title,
        description,
        topic,
        file_type,
        file_size_bytes,
        views_count,
        downloads_count,
        created_at,
        status,
        subject:subjects (
          subject_code,
          subject_name
        )
      )
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Bookmarks loading error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  const bookmarkMaterials: BookmarkMaterial[] = [];

  for (const bookmark of bookmarks ?? []) {
    const material = Array.isArray(bookmark.material)
      ? bookmark.material[0] ?? null
      : bookmark.material;

    if (!material || material.status !== "approved") {
      continue;
    }

    const { data: uploaderData } = await supabase.rpc(
      "get_public_contact_profile",
      { p_profile_id: material.uploader_id },
    );

    const uploader = (uploaderData?.[0] ?? null) as BookmarkMaterial["uploader"];

    const subject = Array.isArray(material.subject)
      ? material.subject[0] ?? null
      : material.subject;

    bookmarkMaterials.push({
      id: material.id,
      uploader_id: material.uploader_id,
      title: material.title,
      description: material.description,
      topic: material.topic,
      file_type: material.file_type,
      file_size_bytes: material.file_size_bytes,
      views_count: material.views_count,
      downloads_count: material.downloads_count,
      created_at: material.created_at,
      uploader,
      subject,
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-6xl space-y-6">
              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Student Resources
                    </p>

                    <h1 className="mt-1 text-2xl font-bold text-foreground">
                      Bookmarks
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Your saved study materials in one place.
                    </p>
                  </div>

                  <Link
                    href="/materials"
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Browse Materials
                  </Link>
                </div>
              </section>

              {bookmarkMaterials.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
                  <h2 className="text-lg font-semibold text-foreground">
                    No bookmarks yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Save useful study materials from the Materials section and
                    they will appear here.
                  </p>

                  <Link
                    href="/materials"
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Browse Materials
                  </Link>
                </section>
              ) : (
                <section>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      {bookmarkMaterials.length} saved{" "}
                      {bookmarkMaterials.length === 1 ? "material" : "materials"}
                    </p>
                  </div>
                  <BookmarksFilter
                    subjects={currentTermSubjects ?? []}
                    materials={bookmarkMaterials}
                  />
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
