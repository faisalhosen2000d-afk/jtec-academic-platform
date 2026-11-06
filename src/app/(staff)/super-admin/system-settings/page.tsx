import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePlatformSettings } from "@/lib/platform-settings";
import SettingsForm from "./SettingsForm";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const activeSettings = await getActivePlatformSettings();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Super Admin Control
          </p>
          <h1 className="text-2xl font-bold mt-1">System Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure real-time registration gates, file upload limits, and maintenance windows.
          </p>
        </div>
        <Link href="/super-admin">
          <Button variant="outline" className="rounded-xl">
            Back to Super Admin
          </Button>
        </Link>
      </div>

      <SettingsForm
        initialSettings={{
          registration_open: activeSettings.registration_open,
          max_upload_size_mb: activeSettings.max_upload_size_mb,
          maintenance_mode: activeSettings.maintenance_mode,
          maintenance_message:
            activeSettings.maintenance_message ||
            "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.",
          maintenance_start_time: activeSettings.maintenance_start_time,
          maintenance_end_time: activeSettings.maintenance_end_time,
          maintenance_bypass_student_ids: activeSettings.maintenance_bypass_student_ids,
          updated_at: new Date().toISOString(),
        }}
      />
    </div>
  );
}