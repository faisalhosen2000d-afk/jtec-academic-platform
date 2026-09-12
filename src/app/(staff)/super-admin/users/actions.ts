"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UserActionResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Verifies a pending student account.
 *
 * Security:
 * - The caller must be authenticated.
 * - The caller must have the Super Admin role.
 * - The database verify_student() function performs the final
 *   permission check and writes the audit log in the same transaction.
 */
export async function verifyStudent(
  targetStudentId: string,
): Promise<UserActionResult> {
  if (!targetStudentId) {
    return {
      success: false,
      error: "Student ID is required.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  /*
   * The UI is for Super Admin use only.
   * The database function also enforces its own permission model.
   */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "super_admin") {
    return {
      success: false,
      error: "You are not authorized to verify students.",
    };
  }

  const { error: verifyError } = await supabase.rpc("verify_student", {
    target_student_id: targetStudentId,
  });

  if (verifyError) {
    return {
      success: false,
      error: verifyError.message,
    };
  }

  revalidatePath("/super-admin/users/students/verification");
  revalidatePath("/super-admin/users/students/accounts");

  return {
    success: true,
  };
}
/**
 * Approves a pending Administration account request.
 *
 * The database RPC performs the final Super Admin permission check
 * and updates the request and profile atomically.
 */
export async function approveAdministrationAccountRequest(
  requestId: string,
): Promise<UserActionResult> {
  if (!requestId) {
    return {
      success: false,
      error: "Account request ID is required.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error: approveError } = await supabase.rpc(
    "approve_administration_account_request",
    {
      p_request_id: requestId,
    },
  );

  if (approveError) {
    return {
      success: false,
      error: approveError.message,
    };
  }

  revalidatePath("/super-admin/account-requests");

  return {
    success: true,
  };
}

/**
 * Rejects a pending Administration account request.
 *
 * The database RPC performs the final Super Admin permission check
 * and records the rejection atomically.
 */
export async function rejectAdministrationAccountRequest(
  requestId: string,
  rejectionReason?: string,
): Promise<UserActionResult> {
  if (!requestId) {
    return {
      success: false,
      error: "Account request ID is required.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { error: rejectError } = await supabase.rpc(
    "reject_administration_account_request",
    {
      p_request_id: requestId,
      p_rejection_reason: rejectionReason?.trim() || undefined,
    },
  );

  if (rejectError) {
    return {
      success: false,
      error: rejectError.message,
    };
  }

  revalidatePath("/super-admin/account-requests");

  return {
    success: true,
  };
}


/**
 * Permanently deletes a student account.
 *
 * Security:
 * - The caller must be authenticated.
 * - The caller must have the Super Admin role.
 * - The target must be a student profile.
 * - Supabase Auth user deletion removes the profile through
 *   the profiles.id -> auth.users.id cascade relationship.
 */
export async function deleteStudentAccount(
  targetStudentId: string,
): Promise<UserActionResult> {
  if (!targetStudentId) {
    return {
      success: false,
      error: "Student ID is required.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { data: currentProfile, error: currentProfileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    currentProfileError ||
    !currentProfile ||
    currentProfile.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "Only Super Admin can delete student accounts.",
    };
  }

  const { data: targetProfile, error: targetProfileError } =
    await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", targetStudentId)
      .maybeSingle();

  if (targetProfileError) {
    return {
      success: false,
      error: targetProfileError.message,
    };
  }

  if (!targetProfile || targetProfile.role !== "student") {
    return {
      success: false,
      error: "Only student accounts can be deleted here.",
    };
  }

  const serviceSupabase = createServiceRoleClient();

  const { error: deleteError } =
    await serviceSupabase.auth.admin.deleteUser(targetStudentId);

  if (deleteError) {
    return {
      success: false,
      error: deleteError.message,
    };
  }

  revalidatePath("/super-admin/users/students/accounts");
  revalidatePath("/super-admin/users/students");

  return {
    success: true,
  };
}


/**
 * Permanently deletes multiple student accounts.
 *
 * Security:
 * - The caller must be authenticated.
 * - The caller must have the Super Admin role.
 * - Every target must be a student profile.
 */
export async function deleteStudentAccounts(
  targetStudentIds: string[],
): Promise<UserActionResult> {
  const uniqueStudentIds = [...new Set(targetStudentIds)].filter(Boolean);

  if (uniqueStudentIds.length === 0) {
    return {
      success: false,
      error: "At least one student must be selected.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { data: currentProfile, error: currentProfileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (
    currentProfileError ||
    !currentProfile ||
    currentProfile.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "Only Super Admin can delete student accounts.",
    };
  }

  const { data: targetProfiles, error: targetProfilesError } =
    await supabase
      .from("profiles")
      .select("id, role")
      .in("id", uniqueStudentIds);

  if (targetProfilesError) {
    return {
      success: false,
      error: targetProfilesError.message,
    };
  }

  if (
    !targetProfiles ||
    targetProfiles.length !== uniqueStudentIds.length ||
    targetProfiles.some((profile) => profile.role !== "student")
  ) {
    return {
      success: false,
      error: "Only student accounts can be deleted here.",
    };
  }

  const serviceSupabase = createServiceRoleClient();

  for (const studentId of uniqueStudentIds) {
    const { error: deleteError } =
      await serviceSupabase.auth.admin.deleteUser(studentId);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message,
      };
    }
  }

  revalidatePath("/super-admin/users/students/accounts");
  revalidatePath("/super-admin/users/students");

  return {
    success: true,
  };
}
