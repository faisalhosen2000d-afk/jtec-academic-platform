import Link from "next/link";
import { Button } from "@/components/ui/button";

const userSections = [
  {
    title: "Students",
    description:
      "View and manage student accounts, verification status, and student-related account controls.",
    href: "/super-admin/users/students",
    action: "Manage Students",
  },
  {
    title: "Staff",
    description:
      "Manage Admin and Moderator staff accounts and their platform access.",
    href: "/super-admin/users/staff",
    action: "Manage Staff",
  },
];

export default function UsersManagementPage() {
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
              Users Management
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage student and staff accounts across the JTEC Academic
              Platform.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        {/* Management Sections */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">User Administration</h2>

            <p className="text-sm text-muted-foreground">
              Choose a user category to manage.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {userSections.map((section) => (
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

        {/* Access Note */}
        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">
            User Administration Access
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            User administration controls are intended for Super Admin use.
            Access control must be enforced server-side and through database
            Row Level Security (RLS), not only through the user interface.
          </p>
        </section>
      </div>
    </main>
  );
}