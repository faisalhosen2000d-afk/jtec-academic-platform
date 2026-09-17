import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import StudentContactSettings from "@/components/student/StudentContactSettings";
import StudentProfilePhoto from "@/components/student/StudentProfilePhoto";

export default async function StudentProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, student_id, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: contactData } = await supabase
    .from("profile_contacts")
    .select(
      "email, phone, whatsapp, facebook, instagram, linkedin, telegram",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  const fullName =
    profileData?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Student";

  const studentId =
    profileData?.student_id ||
    user.user_metadata?.student_id ||
    "Student";

  const profileEmail = profileData?.email || user.email || "";

  const initialContactValues = {
    email: contactData?.email ?? "",
    phone: contactData?.phone ?? "",
    whatsapp: contactData?.whatsapp ?? "",
    facebook: contactData?.facebook ?? "",
    instagram: contactData?.instagram ?? "",
    linkedin: contactData?.linkedin ?? "",
    telegram: "",
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center border-b border-border bg-background px-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Student Portal
              </p>

              <h1 className="text-lg font-semibold text-foreground">
                Profile
              </h1>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Student Profile
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Your account and academic information.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Full Name
                    </p>

                    <p className="mt-1 font-medium text-foreground">
                      {fullName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Student ID
                    </p>

                    <p className="mt-1 font-medium text-foreground">
                      {studentId}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Email
                    </p>

                    <p className="mt-1 break-all font-medium text-foreground">
                      {profileEmail || "Not available"}
                    </p>
                  </div>
                </div>
              </section>

              <StudentProfilePhoto
                userId={user.id}
                fullName={fullName}
                initialAvatarUrl={profileData?.avatar_url ?? null}
              />

              <StudentContactSettings
                initialValues={initialContactValues}
              />

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-green-500"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Account session active
                    </p>

                    <p className="text-xs text-muted-foreground">
                      You are securely signed in to the JTEC Academic
                      Platform.
                    </p>
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

