"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionResult = { success: false, error: "" };

/**
 * Student self-registration.
 *
 * Deliberately does NOT include role, verification status, department,
 * batch, level, or term fields — those are set entirely server-side by
 * the `handle_new_user()` database trigger from the supplied
 * registration code (Phase D/E). The client cannot choose or influence
 * any of them.
 */
export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) =>
      signUp(formData),
    initialState,
  );

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your student account
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ll need a valid registration code from your department to
          sign up. New accounts start unverified until a Super Admin or
          authorized Admin confirms them.
        </p>

        {state.success ? (
          <div className="mt-6 rounded-md border border-success/30 bg-success/10 p-4 text-sm text-success">
            Account created. Please check your email to confirm your address,
            then sign in. After confirming, your account will still need
            staff verification before you can use most student features.
          </div>
        ) : (
          <form action={formAction} className="mt-6 space-y-4" noValidate>
            <FormField
              label="Full name"
              htmlFor="full_name"
              error={fieldErrors?.full_name?.[0]}
            >
              <Input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
              />
            </FormField>

            <FormField
              label="Student ID"
              htmlFor="student_id"
              error={fieldErrors?.student_id?.[0]}
              hint="Enter the Student ID assigned to you by your institution."
            >
              <Input
                id="student_id"
                name="student_id"
                type="text"
                autoComplete="off"
                required
              />
            </FormField>

            <FormField
              label="Email"
              htmlFor="email"
              error={fieldErrors?.email?.[0]}
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </FormField>

            <FormField
              label="Registration code"
              htmlFor="registration_code"
              error={fieldErrors?.registration_code?.[0]}
              hint="Provided by your department. Required to register — your role, department, batch, and verification status are all determined automatically from this code and can't be chosen here."
            >
              <Input
                id="registration_code"
                name="registration_code"
                type="text"
                autoComplete="off"
                required
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              error={fieldErrors?.password?.[0]}
            >
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                showStrength
                required
              />
            </FormField>

            <FormField
              label="Confirm password"
              htmlFor="confirm_password"
              error={fieldErrors?.confirm_password?.[0]}
            >
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                autoComplete="new-password"
                required
              />
            </FormField>

            {generalError ? (
              <p role="alert" className="text-sm text-destructive">
                {generalError}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}