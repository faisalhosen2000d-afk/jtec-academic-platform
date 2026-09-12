"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  is_verified: boolean;
  upload_disabled: boolean;
};

export default function UploadPermissionsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadStudents() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/staff-login";
      return;
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!currentProfile || currentProfile.role !== "super_admin") {
      window.location.href = "/";
      return;
    }

    const { data, error: studentsError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, student_id, email, department_id, is_verified, upload_disabled",
      )
      .eq("role", "student")
      .order("created_at", { ascending: false });

    if (studentsError) {
      setError("Unable to load student upload permissions.");
      setLoading(false);
      return;
    }

    setStudents((data ?? []) as StudentProfile[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  async function toggleUploadPermission(student: StudentProfile) {
    setUpdatingId(student.id);
    setError("");

    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "set_student_upload_disabled",
      {
        p_student_id: student.id,
        p_upload_disabled: !student.upload_disabled,
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setUpdatingId(null);
      return;
    }

    setStudents((current) =>
      current.map((item) =>
        item.id === student.id
          ? {
              ...item,
              upload_disabled: !item.upload_disabled,
            }
          : item,
      ),
    );

    setUpdatingId(null);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Upload Permissions
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage student material-upload permissions when administrative
              action is required.
            </p>
          </div>

          <Link href="/super-admin/users/students">
            <Button variant="outline">Back to Students</Button>
          </Link>
        </div>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">
              Student Upload Permissions
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Enable or disable material uploading for individual student
              accounts.
            </p>
          </div>

          {error && (
            <div className="border-b border-border p-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Unable to update upload permission.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Loading student accounts...
              </p>
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
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Student ID</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Verification</th>
                    <th className="px-5 py-3 font-semibold">
                      Upload Permission
                    </th>
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

                      <td className="px-5 py-4">
                        <Button
                          type="button"
                          variant={
                            student.upload_disabled ? "primary" : "outline"
                          }
                          disabled={updatingId === student.id}
                          onClick={() => void toggleUploadPermission(student)}
                        >
                          {updatingId === student.id
                            ? "Updating..."
                            : student.upload_disabled
                              ? "Enable Upload"
                              : "Disable Upload"}
                        </Button>
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

