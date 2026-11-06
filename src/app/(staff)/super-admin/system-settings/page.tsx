import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import SettingsForm from "./SettingsForm";

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

  const serviceSupabase = createServiceRoleClient();

  const { data: settingsRow } = await (serviceSupabase as any)
    .from("platform_settings")
    .select("registration_open, max_upload_size_mb, maintenance_mode, maintenance_message, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const initialSettings = {
    registration_open: settingsRow?.registration_open ?? true,
    max_upload_size_mb: settingsRow?.max_upload_size_mb ?? 100,
    maintenance_mode: settingsRow?.maintenance_mode ?? false,
    maintenance_message:
      settingsRow?.maintenance_message ??
      "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.",
    updated_at: settingsRow?.updated_at ?? new Date().toISOString(),
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin Control
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              System Settings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure real-time registration gates, file upload limits, and maintenance state.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        <SettingsForm initialSettings={initialSettings} />
      </div>
    </main>
  );
}