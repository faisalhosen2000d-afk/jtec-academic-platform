"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { GraduationCap, ShieldCheck, ArrowRight, User, Lock } from "lucide-react";
import { signIn, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function LoginPage() {
  const [typedStudentId, setTypedStudentId] = useState("");

  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) => {
      const studentId = formData.get("student_id") as string;
      if (studentId) setTypedStudentId(studentId);
      return signIn(formData);
    },
    initialState,
  );

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/70 px-4 py-12 dark:bg-slate-950/80">
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-10 -z-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-md">
        {/* Portal Switcher Pill */}
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-background/80 p-1 shadow-xs backdrop-blur">
            <span className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              Student
            </span>
            <Link
              href="/staff-login"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Staff / Admin
            </Link>
          </div>
        </div>

        {/* Modern Glassmorphic Login Card */}
        <div className="relative rounded-2xl border border-border/80 bg-background/95 p-7 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-9 dark:shadow-black/40">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              Student Portal
            </h1>

            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Sign in with your Student ID &amp; password
            </p>
          </div>

          <form action={formAction} className="mt-7 space-y-4" noValidate>
            {/* Student ID with permanently visible user icon */}
            <div>
              <label htmlFor="student_id" className="block text-xs font-semibold text-foreground mb-1.5">
                Student ID
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  placeholder="e.g. 2021...042"
                  autoComplete="username"
                  required
                  defaultValue={typedStudentId}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                />
              </div>
              {fieldErrors?.student_id?.[0] && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.student_id[0]}</p>
              )}
            </div>

            {/* Password with permanently visible lock icon */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                  <Lock className="h-4 w-4" />
                </span>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  className="pl-10 h-11 rounded-xl bg-muted/20 text-sm focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
                />
              </div>
              {fieldErrors?.password?.[0] && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.password[0]}</p>
              )}
            </div>

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
              {isPending ? "Authenticating..." : "Sign in to Dashboard"}
              {!isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>

          {/* Card Footer */}
          <div className="mt-7 border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              Register here
            </Link>
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