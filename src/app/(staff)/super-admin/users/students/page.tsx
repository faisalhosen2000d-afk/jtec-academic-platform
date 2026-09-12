import Link from "next/link";
import { Button } from "@/components/ui/button";

const studentSections = [
  {
    title: "Student Accounts",
    description:
      "View registered student accounts and their current account status.",
    href: "/super-admin/users/students/accounts",
    action: "View Student Accounts",
  },
  {
    title: "Student Verification",
    description:
      "Review and verify student accounts that are waiting for verification.",
    href: "/super-admin/users/students/verification",
    action: "Manage Verification",
  },
  {
    title: "Upload Permissions",
    description:
      "Manage student material-upload permissions when administrative action is required.",
    href: "/super-admin/users/students/upload-permissions",
    action: "Manage Upload Permissions",
  },
];

export default function StudentsManagementPage() {
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
              Student Management
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage student accounts, verification, and upload permissions.
            </p>
          </div>

          <Link href="/super-admin/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </div>

        {/* Management Sections */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Student Administration</h2>

            <p className="text-sm text-muted-foreground">
              Choose a student-management area.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {studentSections.map((section) => (
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
            Student Administration Access
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Student administration controls are intended for authorized
            Super Admin use. Sensitive account changes must be enforced
            server-side and through database Row Level Security (RLS).
          </p>
        </section>
      </div>
    </main>
  );
}