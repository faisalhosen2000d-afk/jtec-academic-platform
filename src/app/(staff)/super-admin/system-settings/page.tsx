import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function SystemSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin Configuration
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              System Settings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review platform health, upload boundaries, email delivery and core institution settings.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email & SMTP Status */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Email Delivery (SMTP)</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Custom Gmail SMTP is active. Password reset, account verification, and staff provisioning emails are routed through the official college sender address.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Official Sender:</span>
                <span className="font-mono font-medium">jtec.academic@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Host:</span>
                <span className="font-mono font-medium">smtp.gmail.com:465</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hourly Sending Rate Limit:</span>
                <span className="font-mono font-medium">100 emails / hr</span>
              </div>
            </div>
          </section>

          {/* Upload Limits & Storage */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Material Storage Bounds</h2>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configured upload limits and storage bucket boundaries enforced for student and faculty submissions.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max File Size:</span>
                <span className="font-mono font-medium">100 MB per file</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bucket Target:</span>
                <span className="font-mono font-medium">academic-materials</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allowed MIME Types:</span>
                <span className="font-medium">PDF, DOCX, PPTX, Images, ZIP</span>
              </div>
            </div>
          </section>

          {/* Registration Code Rules */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Student Registration Gates</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Enforced
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Self-registration requires a pre-generated one-time registration code tied to specific department and batch assignments.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Code Format:</span>
                <span className="font-mono font-medium">8-character unique alphanumeric</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Single-Use Rule:</span>
                <span className="font-medium text-emerald-600">Yes (invalidated on signup)</span>
              </div>
            </div>
          </section>

          {/* Academic Progression Settings */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Academic Structure &amp; Progression</h2>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                Operational
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Batch-wise progression rules and prerequisite semester verification enforced across all engineering departments.
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Levels Configured:</span>
                <span className="font-mono font-medium">Level 1, 2, 3, 4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terms per Level:</span>
                <span className="font-mono font-medium">Term 1, Term 2</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}