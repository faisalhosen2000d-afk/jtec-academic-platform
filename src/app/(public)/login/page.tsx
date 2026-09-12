"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) =>
      signIn(formData),
    initialState,
  );

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Student Login
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Sign in using your Student ID and password.
        </p>

        <form action={formAction} className="mt-6 space-y-4" noValidate>
          <FormField
            label="Student ID"
            htmlFor="student_id"
            error={fieldErrors?.student_id?.[0]}
          >
            <Input
              id="student_id"
              name="student_id"
              type="text"
              placeholder="Enter your Student ID"
              autoComplete="username"
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
              autoComplete="current-password"
              required
            />
          </FormField>

          {generalError ? (
            <p role="alert" className="text-sm text-destructive">
              {generalError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}