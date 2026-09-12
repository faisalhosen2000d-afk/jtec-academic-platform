import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin") {
    redirect("/staff-login");
  }

  async function handleSignOut() {
    "use server";

    const result = await signOut();

    if (result.success) {
      redirect("/");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              JTEC Academic Platform
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Welcome, {profile.full_name || "Admin"}.
            </p>
          </div>

          <form action={handleSignOut}>
            <Button type="submit" variant="outline">
              Logout
            </Button>
          </form>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Administration</h2>
            <p className="text-sm text-muted-foreground">
              Access the administrative areas available to you.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Student Management
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Manage student-related administrative tasks according to
                  your assigned permissions.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/admin/students">
                  <Button className="w-full">Open Student Management</Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  Materials Review
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Review student-submitted academic materials within your
                  permitted scope.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/admin/materials-review">
                  <Button className="w-full">Open Materials Review</Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Notices</h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Manage notices according to your assigned administrative
                  permissions.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/admin/notices">
                  <Button className="w-full">Open Notices</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
