import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function RegistrationCodeManagementPage() {
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
    .single();

  if (profile?.role !== "super_admin") {
    redirect("/staff-login");
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        {/* Header */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Super Admin
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                Registration Codes
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create registration codes for individual students or generate
                registration codes in bulk from an Excel file.
              </p>
            </div>

            <Link href="/super-admin">
              <Button variant="outline">Back to Super Admin</Button>
            </Link>
          </div>
        </section>

        {/* Registration options */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">
              Choose Registration Method
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Select how you want to create student registration codes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Single Registration */}
            <article className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">
                  Single Registration
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Create a registration code for one student at a time by
                  providing the student&apos;s academic information.
                </p>

                <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Use this for
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    One student registration at a time.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/super-admin/registration-codes">
                  <Button className="w-full">
                    Single Registration
                  </Button>
                </Link>
              </div>
            </article>

            {/* Bulk Registration */}
            <article className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground">
                  Bulk Registration
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Upload an Excel file containing multiple students and
                  generate registration codes for all of them at once.
                </p>

                <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Use this for
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Multiple student registrations using Excel.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/super-admin/registration-codes/bulk">
                  <Button className="w-full">
                    Bulk Registration
                  </Button>
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* Navigation note */}
        <section className="rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold text-foreground">
            Registration Code Workflow
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use Single Registration for one student and Bulk Registration for
            multiple students. Registration codes are generated for the
            students during the registration process.
          </p>
        </section>
      </div>
    </main>
  );
}