import { z } from "zod";

/**
 * Shared auth validation schemas, used by both the Server Actions in
 * `src/server/actions/auth.ts` and the client-side forms Ã¢â‚¬â€ one source
 * of truth for validation rules, per the approved architecture.
 *
 * ASSUMPTION: the project specification does not state an explicit
 * password complexity policy. A minimum length of 8 characters is used
 * here as a reasonable baseline (this is also Supabase Auth's own
 * default minimum). This is a general security convention, not an
 * invented business rule.
 */

const emailField = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const loginSchema = z.object({
  student_id: z
    .string()
    .trim()
    .min(1, "Student ID is required.")
    .max(100, "Student ID is too long."),

  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Staff login.
 *
 * Staff accounts (Super Admin, Admin, Moderator) use their email
 * address and password. Staff accounts are never created through
 * student registration.
 */
export const staffLoginSchema = z.object({
  email: emailField,

  password: z.string().min(1, "Password is required."),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const administrationAccountRequestSchema = z
  .object({
    full_name: z.string().trim().min(2).max(200),
    email: z.string().trim().email(),
    password: passwordField,
    confirm_password: z.string(),
    role: z.enum(["admin", "moderator"]),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type AdministrationAccountRequestInput = z.infer<
  typeof administrationAccountRequestSchema
>;

/**
 * Registration. `registration_code` is required for every student
 * self-registration per the finalized architecture Ã¢â‚¬â€ staff accounts are
 * never created through this flow (they're created by Super Admin via
 * the Auth admin API, outside this schema entirely).
 */
export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(200, "Full name is too long."),

    student_id: z
      .string()
      .trim()
      .min(1, "Student ID is required.")
      .max(100, "Student ID is too long."),

    email: emailField,

    password: passwordField,

    confirm_password: z
      .string()
      .min(1, "Please confirm your password."),

    registration_code: z
      .string()
      .trim()
      .min(1, "A registration code is required."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password. Used on the page the user lands on after following
 * the recovery link Ã¢â‚¬â€ at that point Supabase has already established a
 * recovery session via the auth callback, so only the new password is
 * needed here (no current password field).
 */
export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirm_password: z
      .string()
      .min(1, "Please confirm your password."), 
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
