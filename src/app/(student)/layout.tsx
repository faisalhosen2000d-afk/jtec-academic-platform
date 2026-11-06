import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentMaintenanceView } from "@/components/StudentMaintenanceView";

interface PlatformSettingsRow {
  maintenance_mode: boolean | null;
  maintenance_start_time: string | null;
  maintenance_end_time: string | null;
  maintenance_message: string | null;
}

interface GenericSupabaseClient {
  from: (table: string) => {
    select: (cols: string) => {
      limit: (count: number) => {
        maybeSingle: () => Promise<{ data: PlatformSettingsRow | null }>;
      };
    };
  };
}

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

  // Query platform maintenance mode safely without schema type conflict
  const { data: settings } = await (supabase as unknown as GenericSupabaseClient)
    .from("platform_settings")
    .select("maintenance_mode, maintenance_start_time, maintenance_end_time, maintenance_message")
    .limit(1)
    .maybeSingle();

  if (!isStaff && settings?.maintenance_mode) {
    const now = new Date();
    const startTime = settings.maintenance_start_time;
    const endTime = settings.maintenance_end_time;
    let isActive = false;

    if (!startTime && !endTime) {
      isActive = true;
    } else {
      const start = startTime ? new Date(startTime) : null;
      const end = endTime ? new Date(endTime) : null;
      if (start && end) isActive = now >= start && now <= end;
      else if (start && !end) isActive = now >= start;
      else if (!start && end) isActive = now <= end;
    }

    if (isActive) {
      return (
        <StudentMaintenanceView
          message={settings.maintenance_message}
          startTime={startTime}
          endTime={endTime}
        />
      );
    }
  }

  return <>{children}</>;
}