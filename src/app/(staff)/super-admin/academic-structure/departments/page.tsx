import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "./actions";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Access Denied</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            You must be logged in to access this page.
          </p>

          <div className="mt-5">
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Access Denied</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Only Super Admin can manage departments.
          </p>

          <div className="mt-5">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: departments, error: departmentsError } = await supabase
    .from("departments")
    .select("id, name, code, created_at")
    .order("name", { ascending: true });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin / Academic Structure
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Departments
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage the academic departments of JTEC.
            </p>
          </div>

          <Link href="/super-admin/academic-structure">
            <Button variant="outline">
              Back to Academic Structure
            </Button>
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Add Department</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add a new department with a unique name and code.
            </p>
          </div>

          <form
            action={createDepartment}
            className="grid gap-4 md:grid-cols-3"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Department Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Apparel Engineering"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium"
              >
                Department Code
              </label>

              <input
                id="code"
                name="code"
                type="text"
                placeholder="e.g. AE"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Add Department
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold">
              Existing Departments
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {departments?.length ?? 0} department
              {(departments?.length ?? 0) === 1 ? "" : "s"} found.
            </p>
          </div>

          {departmentsError ? (
            <div className="p-6">
              <p className="text-sm text-destructive">
                Failed to load departments: {departmentsError.message}
              </p>
            </div>
          ) : !departments || departments.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                No departments found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">
                      {department.name}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Code:{" "}
                      <span className="font-medium text-foreground">
                        {department.code}
                      </span>
                    </p>
                  </div>

                  <div className="w-full lg:max-w-2xl">
                    <form
                      action={updateDepartment}
                      className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={department.id}
                      />

                      <input
                        name="name"
                        type="text"
                        defaultValue={department.name}
                        required
                        aria-label={`Department name for ${department.name}`}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />

                      <input
                        name="code"
                        type="text"
                        defaultValue={department.code}
                        required
                        aria-label={`Department code for ${department.name}`}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />

                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>

                    <form
                      action={deleteDepartment}
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={department.id}
                      />

                      <Button
                        type="submit"
                        variant="outline"
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}