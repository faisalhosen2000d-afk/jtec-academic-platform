"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createAdministrationAccountRequest,
  type AuthActionResult,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function AdministrationCreateAccountPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) =>
      createAdministrationAccountRequest(formData),
    initialState,
  );

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  if (state.success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Account Request Submitted
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your Administration account request has been submitted for Super
            Admin approval.
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            You can use Administration Login after your account is approved.
          </p>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/staff-login"
              className="text-primary hover:underline"
            >
              Back to Administration Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create Administration Account
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Submit an account request for Super Admin approval.
        </p>

        <form action={formAction} className="mt-6 space-y-4" noValidate>
          <FormField
            label="Full Name"
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
            label="Password"
            htmlFor="password"
            error={fieldErrors?.password?.[0]}
          >
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
            />
          </FormField>

          <FormField
            label="Confirm Password"
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

          <FormField
            label="Role"
            htmlFor="role"
            error={fieldErrors?.role?.[0]}
          >
            <select
              id="role"
              name="role"
              defaultValue=""
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Select a role
              </option>
              <option value="admin">Administrator</option>
              <option value="moderator">Moderator</option>
            </select>
          </FormField>

          {generalError ? (
            <p role="alert" className="text-sm text-destructive">
              {generalError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting…" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/staff-login" className="text-primary hover:underline">
            Back to Administration Login
          </Link>
        </div>
      </div>
    </main>
  );
}
