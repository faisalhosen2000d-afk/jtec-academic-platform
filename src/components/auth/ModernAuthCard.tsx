"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import {
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  Lock,
  User,
  Mail,
  Compass,
  Award,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  signIn,
  staffSignIn,
  type AuthActionResult,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

const initialAuthState: AuthActionResult = {
  success: false,
  error: "",
};

const mainCls = [
  "relative flex min-h-screen w-full items-stretch justify-center",
  "overflow-hidden bg-[#050811] text-slate-100",
  "selection:bg-brand-red selection:text-white",
].join(" ");

const glowTopCls = [
  "pointer-events-none absolute -top-40 left-1/2 -z-10",
  "h-[500px] w-[500px] -translate-x-1/2 rounded-full",
  "bg-amber-500/10 blur-3xl",
].join(" ");

const glowBotCls = [
  "pointer-events-none absolute -bottom-40 right-1/4 -z-10",
  "h-96 w-96 rounded-full bg-red-600/10 blur-3xl",
].join(" ");

const leftPaneCls = [
  "relative hidden lg:flex lg:w-1/2 flex-col justify-between",
  "overflow-hidden border-r border-slate-800/80 bg-slate-950 p-12",
].join(" ");

const gateImgCls = [
  "object-cover object-center brightness-75",
  "transition-transform duration-1000 ease-out hover:scale-105",
].join(" ");

const gradTopCls = [
  "absolute inset-0 bg-gradient-to-t",
  "from-[#050811] via-[#050811]/75 to-transparent",
].join(" ");

const gradRightCls = [
  "absolute inset-0 bg-gradient-to-r",
  "from-transparent via-[#050811]/40 to-[#050811]",
].join(" ");

const logoGlowSmCls = [
  "absolute -inset-1 rounded-full bg-gradient-to-tr",
  "from-amber-500 via-red-600 to-emerald-500 opacity-60",
  "blur-md transition duration-500 group-hover/logo:opacity-100",
].join(" ");

const logoDiscSmCls = [
  "relative flex h-12 w-12 shrink-0 items-center justify-center",
  "overflow-hidden rounded-full border-2 border-amber-500/80",
  "bg-white p-1 shadow-xl",
].join(" ");

const logoGlowLgCls = [
  "absolute -inset-1.5 rounded-full bg-gradient-to-tr",
  "from-amber-500 via-red-600 to-emerald-500 opacity-60",
  "blur-md transition duration-500 group-hover/crest:opacity-100",
  "animate-pulse",
].join(" ");

const logoDiscLgCls = [
  "relative flex h-16 w-16 items-center justify-center",
  "overflow-hidden rounded-full border-2 border-amber-500/80",
  "bg-white p-1 shadow-2xl",
].join(" ");

const portalBtnCls = [
  "flex items-center gap-2 rounded-full border border-slate-700/80",
  "bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-300",
  "backdrop-blur-md transition-all hover:border-amber-500/60",
  "hover:bg-slate-800 hover:text-white",
].join(" ");

const heroTitleCls = [
  "font-serif text-3xl font-extrabold uppercase leading-tight",
  "tracking-wide text-white drop-shadow-md sm:text-4xl",
].join(" ");

const featureCardCls = [
  "flex items-center gap-3 rounded-xl border border-slate-800/80",
  "bg-slate-900/60 p-3.5 backdrop-blur-md",
].join(" ");

const iconAmberCls = [
  "flex h-9 w-9 shrink-0 items-center justify-center",
  "rounded-lg bg-amber-500/10 text-amber-400",
].join(" ");

const iconRedCls = [
  "flex h-9 w-9 shrink-0 items-center justify-center",
  "rounded-lg bg-red-500/10 text-red-400",
].join(" ");

const statusRowCls = [
  "relative z-10 flex items-center justify-between",
  "border-t border-slate-800/80 pt-6 text-[11px] text-slate-400",
].join(" ");

const authCardCls = [
  "group/auth relative overflow-hidden w-full max-w-md rounded-2xl border border-amber-500/20",
  "bg-[#0A1020]/95 p-6 shadow-[0_0_45px_rgba(245,158,11,0.12)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_0_65px_rgba(245,158,11,0.22)] sm:p-8",
].join(" ");

const tabWrapCls = [
  "mb-6 grid grid-cols-2 rounded-xl",
  "bg-slate-900/90 p-1 border border-slate-800/80",
].join(" ");

const tabBaseCls = [
  "flex items-center justify-center gap-2",
  "rounded-lg py-2.5 text-xs font-semibold transition-all",
].join(" ");

const tabStudentActiveCls = [
  "bg-gradient-to-r from-red-600 to-red-700",
  "text-white shadow-md font-bold",
].join(" ");

const tabStaffActiveCls = [
  "bg-gradient-to-r from-amber-500 to-amber-600",
  "text-slate-950 shadow-md font-bold",
].join(" ");

const errBoxCls = [
  "rounded-xl border border-red-500/30",
  "bg-red-950/40 p-3 text-xs text-red-300",
].join(" ");

const inputCls = [
  "peer h-full w-full rounded-xl border border-slate-700/80",
  "bg-slate-950/80 pl-10 pr-11 text-sm font-medium text-white",
  "placeholder-transparent transition-all duration-200",
  "focus:border-amber-400 focus:bg-slate-900 focus:outline-none",
  "focus:ring-2 focus:ring-amber-500/20",
  "focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-slate-500",
].join(" ");

const labelCls = [
  "pointer-events-none absolute left-10 top-1/2 -translate-y-1/2",
  "text-xs text-slate-400 font-medium transition-all duration-200 z-20",
  "peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3",
  "peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400",
  "peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020]",
  "peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40",
  "peer-focus:rounded-md peer-focus:shadow-sm",
  "peer-[:not(:placeholder-shown)]:-top-2.5",
  "peer-[:not(:placeholder-shown)]:translate-y-0",
  "peer-[:not(:placeholder-shown)]:left-3",
  "peer-[:not(:placeholder-shown)]:text-[10px]",
  "peer-[:not(:placeholder-shown)]:font-bold",
  "peer-[:not(:placeholder-shown)]:text-amber-400",
  "peer-[:not(:placeholder-shown)]:tracking-wider",
  "peer-[:not(:placeholder-shown)]:uppercase",
  "peer-[:not(:placeholder-shown)]:bg-[#0A1020]",
  "peer-[:not(:placeholder-shown)]:px-2",
  "peer-[:not(:placeholder-shown)]:border",
  "peer-[:not(:placeholder-shown)]:border-amber-500/40",
  "peer-[:not(:placeholder-shown)]:rounded-md",
  "peer-[:not(:placeholder-shown)]:shadow-sm",
].join(" ");

const iconWrapCls = [
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2",
  "text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10",
].join(" ");

const eyeBtnCls = [
  "absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400",
  "hover:text-amber-400 p-1 cursor-pointer transition-colors z-20",
].join(" ");

const forgotCls = [
  "text-xs font-semibold text-amber-400",
  "transition-colors hover:text-amber-300",
].join(" ");

const studentSubmitCls = [
  "w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-red-600",
  "to-red-700 font-bold text-white shadow-lg shadow-red-700/30",
  "transition-all hover:from-red-500 hover:to-red-600",
  "hover:shadow-red-600/40 active:scale-[0.99] disabled:opacity-60",
].join(" ");

const staffSubmitCls = [
  "w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500",
  "to-amber-600 font-bold text-slate-950 shadow-lg shadow-amber-500/20",
  "transition-all hover:from-amber-400 hover:to-amber-500",
  "hover:shadow-amber-500/30 active:scale-[0.99] disabled:opacity-60",
].join(" ");

const regLinkCls = [
  "font-bold text-amber-400 underline decoration-amber-500/40",
  "underline-offset-4 transition-colors hover:text-amber-300",
  "hover:decoration-amber-300",
].join(" ");

const backLinkCls = [
  "inline-flex items-center gap-1.5 text-xs text-slate-400",
  "transition-colors hover:text-amber-400",
].join(" ");

const spinLightCls = [
  "h-4 w-4 animate-spin rounded-full",
  "border-2 border-white border-t-transparent",
].join(" ");

const spinDarkCls = [
  "h-4 w-4 animate-spin rounded-full",
  "border-2 border-slate-950 border-t-transparent",
].join(" ");

export default function ModernAuthCard({
  initialRole = "student",
}: {
  initialRole?: "student" | "staff";
}) {
  const [activeTab, setActiveTab] = useState<"student" | "staff">(initialRole);
  const [typedStudentId, setTypedStudentId] = useState("");
  const [typedStaffEmail, setTypedStaffEmail] = useState("");
  const [showStudentPass, setShowStudentPass] = useState(false);
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [typedStudentPass, setTypedStudentPass] = useState("");
  const [typedStaffPass, setTypedStaffPass] = useState("");
  const [dodgeSide, setDodgeSide] = useState<1 | -1>(1);
  const studentReady = typedStudentId.trim().length > 0 && typedStudentPass.length > 0;
  const staffReady = typedStaffEmail.trim().length > 0 && typedStaffPass.length > 0;

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
    <main className={mainCls}>
      <style>{`
        @keyframes authFadeUp {
          0% { opacity: 0; transform: translateY(24px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authGoldShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .auth-stagger {
          animation: authFadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .auth-gold-text {
          background: linear-gradient(90deg, #fbbf24, #fde68a, #f59e0b, #fbbf24);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: authGoldShimmer 5s ease infinite;
        }
      `}</style>
      <div className={glowTopCls} aria-hidden="true" />
      <div className={glowBotCls} aria-hidden="true" />

      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* LEFT PANE */}
        <div className={leftPaneCls}>
          <div className="absolute inset-0 z-0">
            <Image
              src="/campus-gate-night.webp"
              alt="JTEC Campus Gate at Night"
              fill
              className={gateImgCls}
              priority
            />
            <div className={gradTopCls} />
            <div className={gradRightCls} />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative group/logo">
                <div className={logoGlowSmCls} />
                <div className={logoDiscSmCls}>
                  <Image
                    src="/jtec-logo.png"
                    alt="JTEC Emblem"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </div>

              <div>
                <h2 className="font-serif text-lg font-black tracking-wider text-white">
                  JTEC
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90">
                  Academic Platform
                </p>
              </div>
            </div>

            <Link href="/" className={portalBtnCls}>
              <Compass className="h-3.5 w-3.5 text-amber-400" />
              <span>Campus Portal</span>
            </Link>
          </div>

          <div className="relative z-10 my-auto max-w-lg space-y-5 py-8">
            <h1 className={`${heroTitleCls} auth-stagger`} style={{ animationDelay: "100ms" }}>
              Jhenaidah Textile{" "}
              <span className="auth-gold-text">Engineering College</span>
            </h1>

            <p className="auth-stagger text-sm leading-relaxed text-slate-300/90" style={{ animationDelay: "260ms" }}>
              Access your personalized student dashboard, official semester
              transcript, approved course materials, and departmental circulars
              in one unified operating system.
            </p>

            <div className="grid gap-3 pt-2">
              <div className={`${featureCardCls} auth-stagger transition-all duration-300 hover:translate-x-1 hover:border-amber-500/40`} style={{ animationDelay: "420ms" }}>
                <div className={iconAmberCls}>
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Verified Semester Transcripts
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Real-time CGPA calculation & official merit standings.
                  </p>
                </div>
              </div>

              <div className={`${featureCardCls} auth-stagger transition-all duration-300 hover:translate-x-1 hover:border-amber-500/40`} style={{ animationDelay: "580ms" }}>
                <div className={iconRedCls}>
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Central Department Material Vault
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Lecture slides, question bank & lab sheets cataloged by term.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`${statusRowCls} auth-stagger`} style={{ animationDelay: "720ms" }}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>System Status: Operational • All Portals Active</span>
            </div>
            <span>© 2026 JTEC</span>
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2 sm:px-8">
          <div className={authCardCls}>
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl p-[1.5px]"
              style={{
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            >
              <div
                className="absolute inset-[-150%] animate-[spin_7s_linear_infinite] opacity-75 transition-opacity duration-500 group-hover/auth:opacity-100"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(245,158,11,0.9) 60deg, rgba(239,68,68,0.75) 120deg, transparent 190deg, rgba(56,189,248,0.5) 260deg, transparent 340deg)",
                }}
              />
            </div>
            <div className="mb-6 text-center">
              <div className="relative mx-auto mb-3.5 inline-block group/crest">
                <div className={logoGlowLgCls} />
                <div className={logoDiscLgCls}>
                  <Image
                    src="/jtec-logo.png"
                    alt="JTEC Emblem"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </div>

              <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Sign In to Dashboard
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Enter your verified credentials to access your academic portal.
              </p>
            </div>

            <div className={tabWrapCls}>
              <button
                type="button"
                onClick={() => setActiveTab("student")}
                className={`${tabBaseCls} ${
                  activeTab === "student"
                    ? tabStudentActiveCls
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Student Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("staff")}
                className={`${tabBaseCls} ${
                  activeTab === "staff"
                    ? tabStaffActiveCls
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Staff & Admin</span>
              </button>
            </div>

            {activeTab === "student" && (
              <form action={studentFormAction} className="space-y-4">
                {studentError && <div className={errBoxCls}>{studentError}</div>}

                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className={iconWrapCls}>
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="student_id"
                      name="student_id"
                      type="text"
                      required
                      value={typedStudentId} onChange={(e) => setTypedStudentId(e.target.value)}
                      placeholder=" "
                      className={inputCls}
                    />
                    <label htmlFor="student_id" className={labelCls}>
                      Student ID / College Roll
                    </label>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    Enter your official Student ID assigned by the institution.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className={iconWrapCls}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password" value={typedStudentPass} onChange={(e) => setTypedStudentPass(e.target.value)}
                      name="password"
                      type={showStudentPass ? "text" : "password"}
                      required
                      placeholder=" "
                      className={inputCls}
                    />
                    <label htmlFor="password" className={labelCls}>
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStudentPass(!showStudentPass)}
                      className={eyeBtnCls}
                      tabIndex={-1}
                    >
                      {showStudentPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className={forgotCls}>
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div className={`relative flex h-12 w-full items-center justify-center rounded-xl transition-all duration-300 ${studentReady ? "border-transparent bg-transparent" : "overflow-hidden border border-slate-800/80 bg-[#060A12]/80 px-1.5"}`}>
                  {!studentReady && (
                    <span className="pointer-events-none select-none text-[11px] font-medium text-slate-500">
                      Fill ID &amp; password to unlock
                    </span>
                  )}
                  <Button
                    type="submit"
                    disabled={studentPending}
                    onClick={(e) => { if (!studentReady) { e.preventDefault(); setDodgeSide((s) => (s === 1 ? -1 : 1)); } }}
                    onMouseEnter={() => { if (!studentReady) setDodgeSide((s) => (s === 1 ? -1 : 1)); }}
                    className={
                      studentReady
                        ? `${studentSubmitCls} h-12 w-full transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_28px_rgba(220,38,38,0.55)] active:scale-[0.98]`
                        : `absolute h-9 w-40 cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/95 text-xs font-semibold text-slate-300 shadow-lg transition-transform duration-300 ease-out ${
                            dodgeSide === 1 ? "translate-x-[68px]" : "-translate-x-[68px]"
                          }`
                    }
                  >
                    {studentPending ? (
                      <span className="flex items-center gap-2">
                        <span className={spinLightCls} />
                        <span>Verifying...</span>
                      </span>
                    ) : studentReady ? (
                      <span className="flex items-center justify-center gap-2">
                        <span>Sign In to Academic Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Sign In</span>
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {activeTab === "staff" && (
              <form action={staffFormAction} className="space-y-4">
                {staffError && <div className={errBoxCls}>{staffError}</div>}

                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className={iconWrapCls}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={typedStaffEmail} onChange={(e) => setTypedStaffEmail(e.target.value)}
                      placeholder=" "
                      className={inputCls}
                    />
                    <label htmlFor="email" className={labelCls}>
                      Institutional Email
                    </label>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    Use your official faculty/admin email address.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className={iconWrapCls}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="staff-password" value={typedStaffPass} onChange={(e) => setTypedStaffPass(e.target.value)}
                      name="password"
                      type={showStaffPass ? "text" : "password"}
                      required
                      placeholder=" "
                      className={inputCls}
                    />
                    <label htmlFor="staff-password" className={labelCls}>
                      Staff Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowStaffPass(!showStaffPass)}
                      className={eyeBtnCls}
                      tabIndex={-1}
                    >
                      {showStaffPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className={forgotCls}>
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div className={`relative flex h-12 w-full items-center justify-center rounded-xl transition-all duration-300 ${staffReady ? "border-transparent bg-transparent" : "overflow-hidden border border-slate-800/80 bg-[#060A12]/80 px-1.5"}`}>
                  {!staffReady && (
                    <span className="pointer-events-none select-none text-[11px] font-medium text-slate-500">
                      Fill email &amp; password to unlock
                    </span>
                  )}
                  <Button
                    type="submit"
                    disabled={staffPending}
                    onClick={(e) => { if (!staffReady) { e.preventDefault(); setDodgeSide((s) => (s === 1 ? -1 : 1)); } }}
                    onMouseEnter={() => { if (!staffReady) setDodgeSide((s) => (s === 1 ? -1 : 1)); }}
                    className={
                      staffReady
                        ? `${staffSubmitCls} h-12 w-full transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_28px_rgba(245,158,11,0.55)] active:scale-[0.98]`
                        : `absolute h-9 w-40 cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/95 text-xs font-semibold text-slate-300 shadow-lg transition-transform duration-300 ease-out ${
                            dodgeSide === 1 ? "translate-x-[68px]" : "-translate-x-[68px]"
                          }`
                    }
                  >
                    {staffPending ? (
                      <span className="flex items-center gap-2">
                        <span className={spinDarkCls} />
                        <span>Authenticating...</span>
                      </span>
                    ) : staffReady ? (
                      <span className="flex items-center justify-center gap-2">
                        <span>Sign In as Staff / Administrator</span>
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Staff Sign In</span>
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-8 border-t border-slate-800/80 pt-5 text-center space-y-3">
              <p className="text-xs text-slate-400">
                New student without an account?{" "}
                <Link href="/register" className={regLinkCls}>
                  Register with Code
                </Link>
              </p>

              <div>
                <Link href="/" className={backLinkCls}>
                  <Compass className="h-3.5 w-3.5" />
                  <span>Back to Campus Homepage</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
