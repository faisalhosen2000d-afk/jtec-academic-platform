import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentMaintenanceView } from "@/components/StudentMaintenanceView";
import { getActivePlatformSettings, isMaintenanceCurrentlyActive } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Allow admins and moderators full access even during maintenance
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile && ["admin", "super_admin", "moderator"].includes(profile.role);

  if (!isStaff) {
    const settings = await getActivePlatformSettings();
    if (isMaintenanceCurrentlyActive(settings)) {
      return (
        <StudentMaintenanceView
          message={settings.maintenance_message}
          startTime={settings.maintenance_start_time}
          endTime={settings.maintenance_end_time}
        />
      );
    }
  }

  return <>{children}</>;
}