import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type Level = {
  id: string;
  name: string;
  sort_order: number;
};

type Term = {
  id: string;
  level_id: string;
  name: string;
  sort_order: number;
};

export default async function TermsPage() {
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
            Only Super Admin can access this page.
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

  const [
    { data: levels, error: levelsError },
    { data: terms, error: termsError },
  ] = await Promise.all([
    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),

    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const levelRows = (levels ?? []) as Level[];
  const termRows = (terms ?? []) as Term[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin / Academic Structure
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Terms
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Academic terms are fixed according to the JTEC
              academic structure.
            </p>
          </div>

          <Link href="/super-admin/academic-structure">
            <Button variant="outline">
              Back to Academic Structure
            </Button>
          </Link>
        </div>

        {/* Fixed Structure */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Fixed Academic Structure
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Each academic level contains exactly two terms.
            Terms cannot be added, edited, or deleted from the
            Super Admin panel.
          </p>

          <div className="mt-5 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium">
              4 Levels × 2 Terms = 8 Terms
            </p>
          </div>
        </section>

        {/* Error State */}
        {levelsError || termsError ? (
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-destructive">
              Failed to load academic terms.
            </p>

            {levelsError ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Levels: {levelsError.message}
              </p>
            ) : null}

            {termsError ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Terms: {termsError.message}
              </p>
            ) : null}
          </section>
        ) : (
          /* Terms by Level */
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-6">
              <h2 className="text-lg font-semibold">
                Academic Terms
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {termRows.length} terms configured.
              </p>
            </div>

            <div className="space-y-6 p-6">
              {levelRows.map((level) => {
                const levelTerms = termRows
                  .filter((term) => term.level_id === level.id)
                  .sort(
                    (a, b) => a.sort_order - b.sort_order,
                  );

                return (
                  <div
                    key={level.id}
                    className="rounded-xl border border-border bg-background p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Level {level.sort_order}
                        </p>

                        <h3 className="mt-1 text-lg font-semibold">
                          {level.name}
                        </h3>
                      </div>

                      <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                        Fixed
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {levelTerms.map((term) => (
                        <div
                          key={term.id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Term {term.sort_order}
                              </p>

                              <p className="mt-1 font-medium">
                                {term.name}
                              </p>
                            </div>

                            <span className="text-xs font-medium text-muted-foreground">
                              Fixed
                            </span>
                          </div>
                        </div>
                      ))}

                      {levelTerms.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-4 sm:col-span-2">
                          <p className="text-sm text-destructive">
                            No terms configured for this level.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}