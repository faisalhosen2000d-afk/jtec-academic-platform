import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UploadForm from "./UploadForm";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, current_level_id, current_term_id")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !profile.department_id ||
    !profile.current_level_id ||
    !profile.current_term_id
  ) {
    redirect("/dashboard");
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, subject_code, subject_name")
    .eq("department_id", profile.department_id)
    .eq("level_id", profile.current_level_id)
    .eq("term_id", profile.current_term_id)
    .order("subject_code", { ascending: true });

  if (subjectsError) {
    console.error("[upload][subjects]", subjectsError);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              <section>
                <p className="text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Upload Material
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Share useful academic materials with other students.
                </p>
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                {subjectsError ? (
                  <p className="text-sm text-red-600">
                    Unable to load subjects. Please try again.
                  </p>
                ) : (
                  <UploadForm subjects={subjects ?? []} />
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
