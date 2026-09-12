import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

import {
  toggleRegistrationCode,
  deleteRegistrationCode,
} from "./actions";

import { RegistrationCodeForm } from "./registration-code-form";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Batch = {
  id: string;
  name: string;
};

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

type RegistrationCode = {
  id: string;
  code: string;
  role_scope: string;
  department_id: string | null;
  batch_id: string | null;
  level_id: string | null;
  term_id: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  student_id: string;
};

export default async function RegistrationCodesPage() {
  const supabase = await createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-foreground">
            Registration Codes
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            You must be logged in to access this page.
          </p>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-foreground">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Only Super Admin can manage registration codes.
          </p>
        </div>
      </main>
    );
  }

  const [
    departmentsResult,
    batchesResult,
    levelsResult,
    termsResult,
    registrationCodesResult,
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code")
      .order("name"),

    supabase
      .from("batches")
      .select("id, name")
      .order("name"),

    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order"),

    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order"),

    supabase
      .from("registration_codes")
      .select(
        "id, code, role_scope, department_id, batch_id, level_id, term_id, max_uses, used_count, expires_at, is_active, created_at, student_id",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (departmentsResult.error) {
    throw new Error(departmentsResult.error.message);
  }

  if (batchesResult.error) {
    throw new Error(batchesResult.error.message);
  }

  if (levelsResult.error) {
    throw new Error(levelsResult.error.message);
  }

  if (termsResult.error) {
    throw new Error(termsResult.error.message);
  }

  if (registrationCodesResult.error) {
    throw new Error(registrationCodesResult.error.message);
  }

  const departments = (departmentsResult.data ?? []) as Department[];
  const batches = (batchesResult.data ?? []) as Batch[];
  const levels = (levelsResult.data ?? []) as Level[];
  const terms = (termsResult.data ?? []) as Term[];

  const registrationCodes =
    (registrationCodesResult.data ?? []) as RegistrationCode[];

  const departmentMap = new Map(
    departments.map((department) => [department.id, department]),
  );

  const batchMap = new Map(
    batches.map((batch) => [batch.id, batch]),
  );

  const levelMap = new Map(
    levels.map((level) => [level.id, level]),
  );

  const termMap = new Map(
    terms.map((term) => [term.id, term]),
  );

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              Registration Codes
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Create and manage student registration codes with their academic
              assignments.
            </p>
          </div>

          <Link
            href="/super-admin/registration-codes/manage"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to Registration Codes
          </Link>
        </div>

        {/* Create form */}
        <RegistrationCodeForm
          departments={departments}
          batches={batches}
          levels={levels}
          terms={terms}
        />

        {/* Existing codes */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Existing Registration Codes
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {registrationCodes.length} registration code
              {registrationCodes.length === 1 ? "" : "s"} found.
            </p>
          </div>

          {registrationCodes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium text-foreground">
                No registration codes yet.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Create your first registration code using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {registrationCodes.map((registrationCode) => {
                const department = registrationCode.department_id
                  ? departmentMap.get(registrationCode.department_id)
                  : null;

                const batch = registrationCode.batch_id
                  ? batchMap.get(registrationCode.batch_id)
                  : null;

                const level = registrationCode.level_id
                  ? levelMap.get(registrationCode.level_id)
                  : null;

                const term = registrationCode.term_id
                  ? termMap.get(registrationCode.term_id)
                  : null;

                const isExpired =
                  registrationCode.expires_at !== null &&
                  new Date(registrationCode.expires_at).getTime() <= Date.now();

                const isUsedUp =
                  registrationCode.used_count >= registrationCode.max_uses;

                const effectiveActive =
                  registrationCode.is_active && !isExpired && !isUsedUp;

                const statusLabel = isExpired
                  ? "Expired"
                  : isUsedUp
                    ? "Used Up"
                    : registrationCode.is_active
                      ? "Active"
                      : "Inactive";

                const toggleLabel =
                  isExpired || isUsedUp
                    ? "Unavailable"
                    : registrationCode.is_active
                      ? "Deactivate"
                      : "Activate";

                return (
                  <article
                    key={registrationCode.id}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-4">
                        {/* Code + status */}
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-mono text-lg font-bold text-foreground">
                            {registrationCode.code}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              effectiveActive
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {/* Student */}
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Student ID
                          </p>

                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {registrationCode.student_id}
                          </p>
                        </div>

                        {/* Academic assignment */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Department
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {department?.name ?? "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Batch
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {batch?.name ?? "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Level
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {level?.name ?? "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Term
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {term?.name ?? "—"}
                            </p>
                          </div>
                        </div>

                        {/* Usage / expiry */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Usage
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {registrationCode.used_count} /{" "}
                              {registrationCode.max_uses}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Expires
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {registrationCode.expires_at
                                ? new Date(
                                    registrationCode.expires_at,
                                  ).toLocaleString()
                                : "Never"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Created
                            </p>

                            <p className="mt-1 text-sm text-foreground">
                              {new Date(
                                registrationCode.created_at,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {isExpired && (
                          <p className="text-sm font-medium text-destructive">
                            This registration code has expired.
                          </p>
                        )}

                        {!isExpired && isUsedUp && (
                          <p className="text-sm font-medium text-muted-foreground">
                            This registration code has reached its maximum
                            number of uses.
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 lg:shrink-0">
                        <form action={toggleRegistrationCode}>
                          <input
                            type="hidden"
                            name="id"
                            value={registrationCode.id}
                          />

                          <Button
                            type="submit"
                            variant="outline"
                            disabled={isExpired || isUsedUp}
                          >
                            {toggleLabel}
                          </Button>
                        </form>

                        <form action={deleteRegistrationCode}>
                          <input
                            type="hidden"
                            name="id"
                            value={registrationCode.id}
                          />

                          <Button type="submit" variant="outline">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
