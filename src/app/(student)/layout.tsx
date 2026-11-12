import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentMaintenanceView } from "@/components/StudentMaintenanceView";
import { getActivePlatformSettings, isMaintenanceCurrentlyActive, isStudentAuthorizedBypass } from "@/lib/platform-settings";
import { StudentAccessGateWrapper } from "@/components/student/StudentAccessGateWrapper";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

type LayoutProfileRow = {
  role: string;
  student_id: string | null;
  email: string;
  is_verified: boolean;
  verification_status?: string;
  verification_rejection_reason?: string | null;
};

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = (rawProfile as unknown) as LayoutProfileRow | null;

  const isStaff = Boolean(profile && ["admin", "super_admin", "moderator"].includes(profile.role));

  if (profile?.verification_status === "suspended") {
    await supabase.auth.signOut();
    redirect("/login?error=account_suspended");
  }

  if (!isStaff) {
    const settings = await getActivePlatformSettings();

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

  const isApproved =
    isStaff ||
    profile?.is_verified === true ||
    profile?.verification_status === "approved";
  const isRejected = profile?.verification_status === "rejected";

  return (
    <>
      {!isApproved && (
        <div
          className={`w-full border-b px-4 py-2.5 text-xs transition-colors z-40 relative flex items-center justify-between ${
            isRejected
              ? "bg-red-950/80 border-red-500/40 text-red-200"
              : "bg-amber-950/60 border-b border-amber-500/30 shadow-md text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 max-w-4xl">
            {isRejected ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {isRejected ? (
                <>
                  <strong>ID Verification Declined:</strong>{" "}
                  {profile?.verification_rejection_reason || "Your student ID photo could not be verified."}{" "}
                  Please check your profile.
                </>
              ) : (
                <>
                  <strong>Verification in Review:</strong> Your Student ID card photo is currently awaiting institutional review. Academic records and materials will unlock automatically upon approval.
                </>
              )}
            </span>
          </div>

          <Link
            href="/profile"
            className="flex items-center gap-1 font-bold underline hover:opacity-80 shrink-0 ml-4"
          >
            <span>Profile Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <StudentAccessGateWrapper
        isApproved={isApproved}
        verificationStatus={profile?.verification_status}
        rejectionReason={profile?.verification_rejection_reason}
      >
        {children}
      </StudentAccessGateWrapper>
    </>
  );
}
