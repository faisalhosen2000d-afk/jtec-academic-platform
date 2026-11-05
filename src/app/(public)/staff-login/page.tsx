"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ShieldCheck, GraduationCap, ArrowRight } from "lucide-react";
import { staffSignIn, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function StaffLoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) =>
      staffSignIn(formData),
    initialState,
  );

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/60 px-4 py-12 dark:bg-slate-950/80">
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-slate-700/10 blur-3xl dark:bg-slate-400/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-10 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-md">
        {/* Portal Switcher Pill */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-background/80 p-1 shadow-xs backdrop-blur">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Student
            </Link>
            <span className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1 text-xs font-semibold text-background shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff / Admin
            </span>
          </div>
        </div>

        {/* Modern Glassmorphic Login Card */}
        <div className="relative rounded-2xl border border-border/80 bg-background/95 p-7 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-9 dark:shadow-black/40">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/10 text-foreground shadow-xs">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.2} />
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              Staff Administration
            </h1>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Authorized access for Super Admins, Admins &amp; Moderators
            </p>
          </div>

          <form action={formAction} className="mt-7 space-y-4" noValidate>
            <FormField
              label="Staff Email"
              htmlFor="email"
              error={fieldErrors?.email?.[0]}
            >
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="username"
                className="h-11 rounded-xl bg-muted/30 text-sm focus:bg-background"
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
                placeholder="••••••••"
                className="h-11 rounded-xl bg-muted/30 text-sm focus:bg-background"
                required
              />
            </FormField>

            <div className="flex justify-end pt-0.5">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline hover:text-primary/90"
              >
                Forgot your password?
              </Link>
            </div>

            {generalError ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive"
              >
                {generalError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-semibold shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
              disabled={isPending}
            >
              {isPending ? "Verifying..." : "Sign in as Staff"}
              {!isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>

          {/* Card Footer Actions */}
          <div className="mt-7 space-y-2 border-t border-border/60 pt-5 text-center text-xs">
            <p className="text-muted-foreground">
              Need a staff account?{" "}
              <Link
                href="/administration/create-account"
                className="font-semibold text-primary hover:underline"
              >
                Request Access
              </Link>
            </p>
          </div>
        </div>

        {/* Institution Brand */}
        <p className="mt-6 text-center text-[11px] font-medium text-muted-foreground">
          Jhenaidah Textile Engineering College (JTEC)
        </p>
      </div>
    </main>
  );
}