"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  loginSchema,
  staffLoginSchema,
  administrationAccountRequestSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

/**
 * Authentication Server Actions.
 *
 * SECURITY NOTES:
 * - Student accounts use Student ID + password.
 * - Staff accounts use email + password.
 * - Staff role is verified from the authenticated user's profile.
 * - Staff accounts are never created through student registration.
 * - Service-role access is used only for the server-only
 *   Student ID -> email lookup RPC.
 * - No password, token, or service-role credential is exposed.
 */

export type AuthActionResult =
  | { success: true }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

function firstFieldErrors(
  flat: ReturnType<
    | typeof loginSchema.safeParse
    | typeof staffLoginSchema.safeParse
    | typeof administrationAccountRequestSchema.safeParse
    | typeof registerSchema.safeParse
    | typeof forgotPasswordSchema.safeParse
    | typeof resetPasswordSchema.safeParse
  > extends { success: false; error: infer E }
    ? E extends { flatten: () => infer F }
      ? F
      : never
    : never,
) {
  const fieldErrors = (
    flat as { fieldErrors?: Record<string, string[] | undefined> }
  ).fieldErrors;

  if (!fieldErrors) return undefined;

  const cleaned: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value && value.length > 0) {
      cleaned[key] = value;
    }
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Registers a new student account.
 *
 * A valid registration code is required.
 * Academic information is assigned by the database trigger.
 */
export async function signUp(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    student_id: formData.get("student_id"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
    registration_code: formData.get("registration_code"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const {
    full_name,
    student_id,
    email,
    password,
    registration_code,
  } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        student_id,
        registration_code,
      },

      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}

/**
 * Creates a new Administration account request.
 *
 * The account is created immediately with the requested role,
 * but remains unverified until a Super Admin approves the request.
 */
export async function createAdministrationAccountRequest(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = administrationAccountRequestSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const { full_name, email, password, role } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        administration_account_request: "true",
        requested_role: role,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}

/**
 * Signs an existing student in with Student ID + password.
 *
 * Student ID is resolved to the account email through the
 * server-only get_student_login_email RPC before Auth login.
 */export async function signIn(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    student_id: formData.get("student_id"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const { student_id, password } = parsed.data;

  const GENERIC_ERROR = "Invalid Student ID or password.";

  let resolvedEmail: string | null = null;

  try {
    const serviceRoleClient = createServiceRoleClient();

    const { data, error: rpcError } =
      await serviceRoleClient.rpc(
        "get_student_login_email",
        {
          p_student_id: student_id,
        },
      );

    if (!rpcError) {
      resolvedEmail = data ?? null;
    }
  } catch {
    resolvedEmail = null;
  }

  if (!resolvedEmail) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  const supabase = await createClient();

  const { error: signInError } =
    await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

  if (signInError) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  revalidatePath("/", "layout");

  redirect("/dashboard");
}

/**
 * Signs a staff account in with Email + password.
 *
 * Only these roles are allowed:
 * - super_admin
 * - admin
 * - moderator
 *
 * A valid Supabase Auth login alone is not sufficient.
 * The authenticated user's profile role must also be a staff role.
 */
export async function staffSignIn(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = staffLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const { email, password } = parsed.data;

  const GENERIC_ERROR = "Invalid staff email or password.";

  const supabase = await createClient();

  const { error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  /*
   * Authentication succeeded.
   * Now verify that this account actually belongs to a staff role.
   */
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();

  if (
    profileError ||
    !profile ||
    !["super_admin", "admin", "moderator"].includes(profile.role) ||
    (["admin", "moderator"].includes(profile.role) && !profile.is_verified)
  ) {
    /*
     * A student must never retain a session obtained through
     * the staff login form.
     */
    await supabase.auth.signOut();

    return {
      success: false,
      error: GENERIC_ERROR,
    };
  }

  revalidatePath("/", "layout");

  if (profile.role === "super_admin") {
    redirect("/super-admin");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  redirect("/moderator");
}

/**
 * Signs the current user out and clears the session cookie.
 */
export async function signOut(): Promise<AuthActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}

/**
 * Sends a password-recovery email via Supabase Auth's built-in flow.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const { email } = parsed.data;

  const supabase = await createClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        `${process.env.NEXT_PUBLIC_SITE_URL}` +
        `/auth/callback?next=/reset-password`,
    });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Sets a new password for the current recovery session.
 */
export async function updatePassword(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: firstFieldErrors(flat as never),
    };
  }

  const { password } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}

