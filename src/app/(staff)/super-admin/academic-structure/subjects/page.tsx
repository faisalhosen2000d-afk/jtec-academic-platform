import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  createSubject,
  updateSubject,
  deleteSubject,
} from "./actions";
import { SubjectForm } from "./subject-form";
import { SubjectItem } from "./subject-item";

type Department = {
  id: string;
  name: string;
  code: string;
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

type Subject = {
  id: string;
  department_id: string;
  level_id: string;
  term_id: string;
  subject_code: string;
  subject_name: string;
};

export default async function SubjectsPage() {
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

  const { data: profile, error: profileError } =
    await supabase
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
            Only Super Admin can manage subjects.
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
    { data: departments, error: departmentsError },
    { data: levels, error: levelsError },
    { data: terms, error: termsError },
    { data: subjects, error: subjectsError },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true }),

    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),

    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order", { ascending: true }),

    supabase
      .from("subjects")
      .select(
        "id, department_id, level_id, term_id, subject_code, subject_name",
      )
      .order("subject_code", { ascending: true }),
  ]);

  const departmentRows = (departments ?? []) as Department[];
  const levelRows = (levels ?? []) as Level[];
  const termRows = (terms ?? []) as Term[];
  const subjectRows = (subjects ?? []) as Subject[];

  const loadError =
    departmentsError ||
    levelsError ||
    termsError ||
    subjectsError;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin / Academic Structure
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Subjects
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage subjects by department, level, and term.
            </p>
          </div>

          <Link href="/super-admin/academic-structure">
            <Button variant="outline">
              Back to Academic Structure
            </Button>
          </Link>
        </div>

        {/* Add Subject */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Add Subject
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add a subject to a specific department, level, and term.
            </p>
          </div>

          <SubjectForm
            departments={departmentRows}
            levels={levelRows}
            terms={termRows}
            action={createSubject}
          />
        </section>

        {/* Summary */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Departments
            </p>

            <p className="mt-1 text-2xl font-bold">
              {departmentRows.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Levels
            </p>

            <p className="mt-1 text-2xl font-bold">
              {levelRows.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Total Subjects
            </p>

            <p className="mt-1 text-2xl font-bold">
              {subjectRows.length}
            </p>
          </div>
        </section>

        {/* Subject List */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold">
              Subject List
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Subjects are organized by department, level, and term.
            </p>
          </div>

          {loadError ? (
            <div className="p-6">
              <p className="text-sm text-destructive">
                Failed to load academic structure.
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                {loadError.message}
              </p>
            </div>
          ) : departmentRows.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                No departments configured.
              </p>
            </div>
          ) : (
            <div className="space-y-8 p-6">
              {departmentRows.map((department) => (
                <div
                  key={department.id}
                  className="rounded-xl border border-border bg-background"
                >
                  <div className="border-b border-border p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Department
                        </p>

                        <h3 className="mt-1 text-lg font-semibold">
                          {department.name}
                        </h3>
                      </div>

                      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
                        {department.code}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    {levelRows.map((level) => {
                      const levelTerms = termRows.filter(
                        (term) =>
                          term.level_id === level.id,
                      );

                      const departmentSubjects =
                        subjectRows.filter(
                          (subject) =>
                            subject.department_id ===
                              department.id &&
                            subject.level_id === level.id,
                        );

                      return (
                        <div
                          key={level.id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">
                              {level.name}
                            </h4>

                            <span className="text-xs text-muted-foreground">
                              {departmentSubjects.length} subjects
                            </span>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {levelTerms.map((term) => {
                              const termSubjects =
                                departmentSubjects.filter(
                                  (subject) =>
                                    subject.term_id === term.id,
                                );

                              return (
                                <div
                                  key={term.id}
                                  className="rounded-lg border border-border p-4"
                                >
                                  <div className="mb-3 flex items-center justify-between">
                                    <h5 className="font-medium">
                                      {term.name}
                                    </h5>

                                    <span className="text-xs text-muted-foreground">
                                      {termSubjects.length} subjects
                                    </span>
                                  </div>

                                  {termSubjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      No subjects configured.
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {termSubjects.map(
                                        (subject) => (
                                          <SubjectItem
                                            key={subject.id}
                                            subject={subject}
                                            updateAction={
                                              updateSubject
                                            }
                                            deleteAction={
                                              deleteSubject
                                            }
                                          />
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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