import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  createBatch,
  deleteBatch,
  updateBatch,
} from "./actions";

export default async function BatchesPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            You must be logged in to access this page.
          </p>

          <div className="mt-5">
            <Link href="/staff-login">
              <Button>Go to Staff Login</Button>
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
          <h1 className="text-xl font-semibold">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Only Super Admin can manage batches.
          </p>

          <div className="mt-5">
            <Link href="/super-admin">
              <Button variant="outline">
                Back to Super Admin
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("id, name, created_at")
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
              Batches
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage student batches of JTEC.
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
            <h2 className="text-lg font-semibold">
              Add Batch
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add a new student batch with a unique name.
            </p>
          </div>

          <form
            action={createBatch}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="w-full sm:max-w-md">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Batch Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. 9th Batch"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button type="submit">
              Add Batch
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold">
              Existing Batches
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {batches?.length ?? 0} batch
              {(batches?.length ?? 0) === 1 ? "" : "es"} found.
            </p>
          </div>

          {batchesError ? (
            <div className="p-6">
              <p className="text-sm text-destructive">
                Failed to load batches: {batchesError.message}
              </p>
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                No batches found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">
                      {batch.name}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      ID: {batch.id}
                    </p>
                  </div>

                  <div className="w-full sm:max-w-xl">
                    <form
                      action={updateBatch}
                      className="flex flex-col gap-3 sm:flex-row"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={batch.id}
                      />

                      <input
                        name="name"
                        type="text"
                        defaultValue={batch.name}
                        required
                        aria-label={`Batch name for ${batch.name}`}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />

                      <Button
                        type="submit"
                        variant="secondary"
                      >
                        Save
                      </Button>
                    </form>

                    <form
                      action={deleteBatch}
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={batch.id}
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