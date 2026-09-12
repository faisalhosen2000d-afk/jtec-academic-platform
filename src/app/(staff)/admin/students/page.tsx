import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStudentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/staff-login");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Student Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage student-related administrative tasks within your assigned permissions.
            </p>
          </div>

          <Link href="/admin">
            <Button variant="outline">Back to Admin Dashboard</Button>
          </Link>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Student Administration</h2>
            <p className="text-sm text-muted-foreground">
              Select a student management area available to Admin staff.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Student Verification</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review and verify student accounts according to the Admin permission scope.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/admin/students/verification">
                  <Button className="w-full">Manage Student Verification</Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Upload Permissions
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Manage student material-upload permissions according to the Admin permission scope.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/admin/students/upload-permissions">
                  <Button className="w-full">
                    Manage Upload Permissions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Permission Control</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Student-management capabilities are controlled by Super Admin
            permission scopes and must be enforced server-side and through
            database Row Level Security (RLS).
          </p>
        </section>
      </div>
    </main>
  );
}
