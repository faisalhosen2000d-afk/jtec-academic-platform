import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";

const sections = [
  {
    title: "Academic Structure",
    description:
      "Manage departments, batches, levels, terms, and subjects.",
    href: "/super-admin/academic-structure",
    action: "Manage Academic Structure",
  },
  {
    title: "Registration Codes",
    description:
      "Create and manage student registration codes with academic assignments.",
    href: "/super-admin/registration-codes/manage",
    action: "Manage Registration Codes",
  },
  {
    title: "Notice Management",
    description:
      "Create, publish, and manage academic notices for students.",
    href: "/admin/notices",
    action: "Manage Notices",
  },
  {
    title: "Account Requests",
    description:
      "Review and approve or reject Administrator and Moderator account requests.",
    href: "/super-admin/account-requests",
    action: "Review Account Requests",
  },
  {
    title: "Users",
    description:
      "Manage students, admins, moderators, and account-related controls.",
    href: "/super-admin/users",
    action: "Manage Users",
  },
  {
    title: "Audit Logs",
    description:
      "Review important administrative and system activities.",
    href: "/super-admin/audit-logs",
    action: "View Audit Logs",
  },
  {
    title: "System Settings",
    description:
      "Manage platform-level configuration and system settings.",
    href: "/super-admin/system-settings",
    action: "Open System Settings",
  },
];

export default function SuperAdminPage() {
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
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              JTEC Academic Platform
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Super Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage the academic structure, users, registration, and system
              administration.
            </p>
          </div>

          <form action={handleSignOut}>
            <Button type="submit" variant="outline">
              Logout
            </Button>
          </form>
        </div>

        {/* Overview */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Administration</h2>
            <p className="text-sm text-muted-foreground">
              Select an area to manage the platform.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
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

        {/* Security notice */}
        <section className="rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Super Admin Access</h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            These controls are intended for Super Admin use only. Access
            control must be enforced server-side and by database Row Level
            Security (RLS), not only by hiding UI elements.
          </p>
        </section>
      </div>
    </main>
  );
}

