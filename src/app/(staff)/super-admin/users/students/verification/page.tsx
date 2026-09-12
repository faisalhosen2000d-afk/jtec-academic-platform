import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { verifyStudent } from "../../actions";

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

async function handleVerifyStudent(studentId: string) {
  "use server";

  await verifyStudent(studentId);
}

function VerifyButton({ studentId }: { studentId: string }) {
  return (
    <form action={handleVerifyStudent.bind(null, studentId)}>
      <Button type="submit">Verify</Button>
    </form>
  );
}

export default async function StudentVerificationPage() {
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
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Student Verification
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Review student accounts that are waiting for verification.
            </p>
          </div>

          <Link href="/super-admin/users/students">
            <Button variant="outline">Back to Students</Button>
          </Link>
        </div>

        {/* Summary */}
        <section className="mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Students awaiting verification
            </p>

            <p className="mt-1 text-2xl font-bold">{students.length}</p>
          </div>
        </section>

        {/* Pending Students */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">
              Pending Student Accounts
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              These student accounts have not yet been verified.
            </p>
          </div>

          {error ? (
            <div className="p-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Unable to load pending student accounts.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Please try again after checking the database connection and
                  permissions.
                </p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-base font-semibold">
                No pending students
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                There are currently no student accounts waiting for
                verification.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
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
                        <VerifyButton studentId={student.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Security Note */}
        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Verification Control</h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Student verification uses the existing server-side verification
            function and its permission checks. The interface does not bypass
            database Row Level Security (RLS).
          </p>
        </section>
      </div>
    </main>
  );
}