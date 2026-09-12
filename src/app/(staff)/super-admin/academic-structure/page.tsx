import Link from "next/link";
import { Button } from "@/components/ui/button";

const academicSections = [
  {
    title: "Departments",
    description:
      "Create, update, and manage the academic departments of JTEC.",
    href: "/super-admin/academic-structure/departments",
    action: "Manage Departments",
  },
  {
    title: "Batches",
    description:
      "Create and manage student batches used across the academic platform.",
    href: "/super-admin/academic-structure/batches",
    action: "Manage Batches",
  },
  {
    title: "Levels",
    description:
      "Manage the four academic levels of the program.",
    href: "/super-admin/academic-structure/levels",
    action: "Manage Levels",
  },
  {
    title: "Terms",
    description:
      "Manage terms under each academic level.",
    href: "/super-admin/academic-structure/terms",
    action: "Manage Terms",
  },
  {
    title: "Subjects",
    description:
      "Manage subjects and their department, level, and term assignments.",
    href: "/super-admin/academic-structure/subjects",
    action: "Manage Subjects",
  },
];

export default function AcademicStructurePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Academic Structure
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage the academic structure used throughout the JTEC Academic
              Platform.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        {/* Sections */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Academic Management</h2>

            <p className="text-sm text-muted-foreground">
              Choose an academic structure component to manage.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {academicSections.map((section) => (
              <div
                key={section.href}
                className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{section.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {section.description}
                  </p>
                </div>

                <div className="mt-5">
                  <Link href={section.href}>
                    <Button className="w-full">{section.action}</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Structure summary */}
        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Current Structure</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Departments</p>
              <p className="mt-1 text-sm font-medium">4 Departments</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Levels</p>
              <p className="mt-1 text-sm font-medium">4 Levels</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Terms</p>
              <p className="mt-1 text-sm font-medium">8 Terms</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Subjects</p>
              <p className="mt-1 text-sm font-medium">Subject Management</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Batches</p>
              <p className="mt-1 text-sm font-medium">Batch Management</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}