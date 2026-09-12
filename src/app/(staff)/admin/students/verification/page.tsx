import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  is_verified: boolean;
  created_at: string;
};

async function verifyStudentAsAdmin(studentId: string) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/staff-login");
  }

  const { error } = await supabase.rpc("verify_student", {
    target_student_id: studentId,
  });

  if (error) {
    redirect(
      `/admin/students/verification?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/admin/students/verification");
  revalidatePath("/admin/students");

  redirect("/admin/students/verification?verified=1");
}

export default async function AdminStudentVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{
    verified?: string;
    error?: string;
  }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

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

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/staff-login");
  }

  const { data: scopes } = await supabase
    .from("staff_scopes")
    .select("department_id, can_verify_students")
    .eq("profile_id", user.id)
    .eq("can_verify_students", true);

  if (!scopes || scopes.length === 0) {
    redirect("/admin/students");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, student_id, email, department_id, batch_id, is_verified, created_at",
    )
    .eq("role", "student")
    .eq("is_verified", false)
    .order("created_at", { ascending: true });

  const students = (data ?? []) as StudentProfile[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Student Verification
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Review student accounts waiting for verification within your
              assigned permission scope.
            </p>
          </div>

          <Link href="/admin/students">
            <Button variant="outline">Back to Student Management</Button>
          </Link>
        </div>

        {params.verified === "1" && (
          <section className="mb-6 rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-medium">
              Student account verified successfully.
            </p>
          </section>
        )}

        {params.error && (
          <section className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <p className="text-sm font-medium text-destructive">
              {params.error}
            </p>
          </section>
        )}

        <section className="mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Students awaiting verification
            </p>

            <p className="mt-1 text-2xl font-bold">{students.length}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">
              Pending Student Accounts
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Only students visible within your permitted scope are shown.
            </p>
          </div>

          {error ? (
            <div className="p-5">
              <p className="text-sm text-destructive">
                Unable to load student accounts.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">No pending student accounts</p>
              <p className="mt-1 text-sm text-muted-foreground">
                There are currently no unverified students available in your
                permitted scope.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Student ID</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Registered</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">{student.full_name}</div>
                      </td>

                      <td className="px-5 py-4">
                        {student.student_id ?? "—"}
                      </td>

                      <td className="px-5 py-4">{student.email}</td>

                      <td className="px-5 py-4">
                        {student.department_id ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <form
                          action={verifyStudentAsAdmin.bind(
                            null,
                            student.id,
                          )}
                        >
                          <Button type="submit">Verify</Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Verification Control</h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Verification is controlled by the Admin permission scope and the
            existing database-level verification function. Unauthorized
            verification attempts are rejected server-side.
          </p>
        </section>
      </div>
    </main>
  );
}
