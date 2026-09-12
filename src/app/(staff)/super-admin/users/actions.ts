"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

