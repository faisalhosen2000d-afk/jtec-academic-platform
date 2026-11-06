"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { GraduationCap, ShieldCheck, ArrowRight, Lock, User, Mail } from "lucide-react";
import { signIn, staffSignIn, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const initialAuthState: AuthActionResult = {
  success: false,
  error: "",
};

export default function ModernAuthCard({ initialRole = "student" }: { initialRole?: "student" | "staff" }) {
  const [activeTab, setActiveTab] = useState<"student" | "staff">(initialRole);
  const [typedStudentId, setTypedStudentId] = useState("");
  const [typedStaffEmail, setTypedStaffEmail] = useState("");

  const [studentState, studentFormAction, studentPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) => {
      const studentId = formData.get("student_id") as string;
      if (studentId) setTypedStudentId(studentId);
      return signIn(formData);
    },
    initialAuthState,
  );

  const [staffState, staffFormAction, staffPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) => {
      const email = formData.get("email") as string;
      if (email) setTypedStaffEmail(email);
      return staffSignIn(formData);
    },
    initialAuthState,
  );

  const studentError = studentState.success ? undefined : studentState.error;
  const staffError = staffState.success ? undefined : staffState.error;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50/70 px-4 py-10 dark:bg-slate-950">
      {/* Background Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-md">
        {/* Header Institution Badge */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-xs backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Jhenaidah Textile Engineering College
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            JTEC Academic Platform
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in to access courses, notices, results and academic tools
          </p>
        </div>

        {/* 2-in-1 Unified Card */}
        <div className="relative rounded-3xl border border-border/80 bg-background/95 p-6 sm:p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-all">
          
          {/* Smooth Sliding Tab Switcher */}
          <div className="relative flex rounded-2xl bg-muted/60 p-1.5 shadow-inner backdrop-blur-md">
            <div
              className="absolute inset-y-1.5 rounded-xl bg-background shadow-md transition-all duration-300 ease-out"
              style={{
                left: activeTab === "student" ? "6px" : "calc(50% + 3px)",
                width: "calc(50% - 9px)",
              }}
            />
            <button
              type="button"
              onClick={() => setActiveTab("student")}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors duration-200 ${
                activeTab === "student" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold transition-colors duration-200 ${
                activeTab === "staff" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Staff / Admin
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-6">
            {activeTab === "student" ? (
              <form action={studentFormAction} className="space-y-4 animate-in fade-in duration-200" noValidate>
                <div>
                  <label htmlFor="home_student_id" className="block text-xs font-semibold text-foreground mb-1.5">
                    Student ID
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      id="home_student_id"
                      name="student_id"
                      type="text"
                      placeholder="e.g. 2021...042"
                      autoComplete="username"
                      required
                      defaultValue={typedStudentId}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="home_student_password" className="block text-xs font-semibold text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                      <Lock className="h-4 w-4" />
                    </span>
                    <PasswordInput
                      id="home_student_password"
                      name="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="pl-10 h-11 rounded-xl bg-muted/20 text-sm focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {studentError && (
                  <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
                    {studentError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={studentPending}
                  className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {studentPending ? "Signing in..." : "Sign in to Dashboard"}
                  {!studentPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-semibold text-primary hover:underline">
                    Register here
                  </Link>
                </div>
              </form>
            ) : (
              <form action={staffFormAction} className="space-y-4 animate-in fade-in duration-200" noValidate>
                <div>
                  <label htmlFor="home_staff_email" className="block text-xs font-semibold text-foreground mb-1.5">
                    Staff Email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      id="home_staff_email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="username"
                      required
                      defaultValue={typedStaffEmail}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="home_staff_password" className="block text-xs font-semibold text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                      <Lock className="h-4 w-4" />
                    </span>
                    <PasswordInput
                      id="home_staff_password"
                      name="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="pl-10 h-11 rounded-xl bg-muted/20 text-sm focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {staffError && (
                  <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
                    {staffError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={staffPending}
                  className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {staffPending ? "Verifying..." : "Sign in as Staff"}
                  {!staffPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
                  Need a staff account?{" "}
                  <Link href="/administration/create-account" className="font-semibold text-primary hover:underline">
                    Request Access
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] font-medium text-muted-foreground">
          &copy; {new Date().getFullYear()} JTEC Academic Platform • All Rights Reserved
        </p>
      </div>
    </main>
  );
}