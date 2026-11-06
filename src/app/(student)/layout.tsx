import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentMaintenanceView } from "@/components/StudentMaintenanceView";
import { getActivePlatformSettings, isMaintenanceCurrentlyActive, isStudentAuthorizedBypass } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, student_id, email")
    .eq("id", user.id)
    .single();

  // Way 1: Allow Admins, Super Admins & Moderators
  const isStaff = profile && ["admin", "super_admin", "moderator"].includes(profile.role);

  if (!isStaff) {
    const settings = await getActivePlatformSettings();

    // Way 2: Check all possible student ID locations (profile.student_id, user_metadata.student_id, email)
    const metaStudentId =
      user.user_metadata && typeof user.user_metadata.student_id === "string"
        ? user.user_metadata.student_id
        : null;

    const isTestStudent = isStudentAuthorizedBypass(
      [profile?.student_id, metaStudentId, user.email, profile?.email],
      settings.maintenance_bypass_student_ids
    );

    if (!isTestStudent && isMaintenanceCurrentlyActive(settings)) {
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