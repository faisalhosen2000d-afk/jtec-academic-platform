import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  current_level_id: string | null;
  current_term_id: string | null;
  is_verified: boolean;
  upload_disabled: boolean;
  created_at: string;
};

export default async function StudentAccountsPage() {
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
      "id, full_name, student_id, email, department_id, batch_id, current_level_id, current_term_id, is_verified, upload_disabled, created_at",
    )
    .eq("role", "student")
    .order("created_at", { ascending: false });

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
              Student Accounts
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              View registered student accounts and their current account
              status.
            </p>
          </div>

          <Link href="/super-admin/users/students">
            <Button variant="outline">Back to Students</Button>
          </Link>
        </div>

        {/* Summary */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="mt-1 text-2xl font-bold">{students.length}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="mt-1 text-2xl font-bold">
              {students.filter((student) => student.is_verified).length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Upload Disabled
            </p>
            <p className="mt-1 text-2xl font-bold">
              {students.filter((student) => student.upload_disabled).length}
            </p>
          </div>
        </section>

        {/* Student List */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Registered Students</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Student accounts currently stored in the platform.
            </p>
          </div>

          {error ? (
            <div className="p-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Unable to load student accounts.
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
                No student accounts found
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                There are currently no student profiles available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Student ID</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Verification</th>
                    <th className="px-5 py-3 font-semibold">
                      Upload Permission
                    </th>
                    <th className="px-5 py-3 font-semibold">Created</th>
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

                      <td className="px-5 py-4">
                        {student.email}
                      </td>

                      <td className="px-5 py-4">
                        {student.is_verified ? (
                          <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {student.upload_disabled ? (
                          <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                            Enabled
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}