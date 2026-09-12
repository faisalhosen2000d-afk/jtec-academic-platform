import Link from "next/link";
import { Button } from "@/components/ui/button";

const staffSections = [
  {
    title: "Staff Accounts",
    description:
      "Create and manage Admin and Moderator staff accounts and their platform access.",
    href: "/super-admin/users/staff/accounts",
    action: "Manage Staff Accounts",
  },
  {
    title: "Staff Permissions",
    description:
      "Manage department scope and capability permissions for Admin staff.",
    href: "/super-admin/users/staff/permissions",
    action: "Manage Permissions",
  },
];

export default function StaffManagementPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Staff Management
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage Admin and Moderator staff accounts and their platform
              permissions.
            </p>
          </div>

          <Link href="/super-admin/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Staff Administration</h2>

            <p className="text-sm text-muted-foreground">
              Choose a staff-management area.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {staffSections.map((section) => (
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

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">
            Staff Administration Access
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Staff administration controls are intended for Super Admin use.
            Account and permission changes must be enforced server-side and
            through database Row Level Security (RLS), not only through the
            user interface.
          </p>
        </section>
      </div>
    </main>
  );
}
