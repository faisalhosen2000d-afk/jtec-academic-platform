"use client";

import Link from "next/link";
import { useState, useActionState, useMemo } from "react";
import { signUp, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  BadgeCheck, 
  Key, 
  User, 
  Mail, 
  Lock, 
  FileText, 
  CheckCheck, 
  Edit3, 
  GraduationCap,
  Eye,
  EyeOff,
  ShieldCheck,
  Circle
} from "lucide-react";

const initialState: AuthActionResult = { success: false, error: "" };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) =>
      signUp(formData),
    initialState,
  );

  const [step, setStep] = useState<number>(1);
  const [clientError, setClientError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Controlled values for the Step 4 receipt preview
  const [formDataValues, setFormDataValues] = useState({
    student_id: "",
    registration_code: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormDataValues((prev) => ({ ...prev, [field]: value }));
    setClientError("");
  };

  // Live password rules calculation
  const pwdCriteria = useMemo(() => {
    const pwd = formDataValues.password || "";
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      numberOrSpecial: /[0-9]|[^A-Za-z0-9]/.test(pwd),
    };
  }, [formDataValues.password]);

  const satisfiedCount = useMemo(() => {
    return Object.values(pwdCriteria).filter(Boolean).length;
  }, [pwdCriteria]);

  const validateAndAdvance = (targetStep: number) => {
    setClientError("");
    if (targetStep === 2) {
      if (!formDataValues.student_id.trim()) {
        setClientError("Please enter your Student ID / Roll number.");
        return;
      }
      if (!formDataValues.registration_code.trim()) {
        setClientError("Please enter your departmental Registration Code.");
        return;
      }
    } else if (targetStep === 3) {
      if (!formDataValues.full_name.trim()) {
        setClientError("Please enter your full legal name.");
        return;
      }
      if (!formDataValues.email.trim() || !formDataValues.email.includes("@")) {
        setClientError("Please enter a valid email address.");
        return;
      }
    } else if (targetStep === 4) {
      if (!formDataValues.password || formDataValues.password.length < 8) {
        setClientError("Password must be at least 8 characters long.");
        return;
      }
      if (formDataValues.password !== formDataValues.confirm_password) {
        setClientError("Passwords do not match. Please re-check.");
        return;
      }
    }
    setStep(targetStep);
  };

  const fieldErrors = state.success ? undefined : state.fieldErrors;
  const generalError = state.success ? undefined : state.error;

  const stepTitles = [
    "",
    "Institutional Verification",
    "Personal Identity Details",
    "Account Security & Password",
    "Registration Summary Slip",
  ];

  const stepDescriptions = [
    "",
    "Enter your Student ID and departmental registration code to begin.",
    "Provide your full name and official email address for portal alerts.",
    "Choose a strong, secure password to protect your academic portal.",
    "Review your registration details below before submitting official creation.",
  ];

  const progressWidths = ["0%", "0%", "33%", "66%", "100%"];

  return (
    <main className="min-h-screen bg-[#050811] text-slate-200 antialiased font-sans flex flex-col justify-between selection:bg-red-700 selection:text-white px-4 py-8">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-red-900 to-amber-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#070B14] rounded-[10px] flex items-center justify-center font-serif font-black text-amber-400 text-base">
              J
            </div>
          </div>
          <div>
            <span className="font-serif font-bold text-base text-white tracking-wider">JTEC</span>
            <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400 block -mt-1">
              Student Onboarding
            </span>
          </div>
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:shadow-lg hover:shadow-amber-500/5 active:scale-95 transition-all"
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span>Already registered? Sign In</span>
        </Link>
      </header>

      {/* Main Registration Card Container */}
      <div className="max-w-2xl mx-auto w-full py-8">
        <div className="relative group rounded-3xl p-1 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-900/80 shadow-2xl transition-all duration-500 hover:shadow-[0_20px_70px_-15px_rgba(245,158,11,0.25)] hover:border-amber-500/30">
          <div className="rounded-[22px] bg-[#0A1020]/95 backdrop-blur-xl border border-slate-800/90 p-6 sm:p-10 transition-colors duration-300 group-hover:border-slate-700">
            
            {state.success ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white">Account Created Successfully!</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  Please check your email to confirm your address, then sign in. Your account is automatically synced to your department and batch.
                </p>
                <div className="pt-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-900 to-red-600 text-white font-semibold text-sm shadow-xl shadow-red-950/60 hover:scale-105 transition-all border border-red-500/40"
                  >
                    <span>Proceed to Student Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Header Titles */}
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 mb-3 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Step {step} of 4: Multi-Step Verified Registration
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-black text-white">
                    {stepTitles[step]}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                    {stepDescriptions[step]}
                  </p>
                </div>

                {/* Stepper Progress Bar */}
                <div className="relative mb-10 px-2 sm:px-6">
                  <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-800 rounded-full z-0">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      style={{ width: progressWidths[step] }}
                    />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    {[
                      { num: 1, label: "Code" },
                      { num: 2, label: "Identity" },
                      { num: 3, label: "Security" },
                      { num: 4, label: "Receipt" },
                    ].map(({ num, label }) => {
                      const isDone = num < step;
                      const isActive = num === step;
                      return (
                        <div key={num} className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => (isDone ? setStep(num) : null)}
                            disabled={!isDone}
                            className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border-2 transition-all duration-300 ${
                              isDone
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-105"
                                : isActive
                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/40 scale-110"
                                : "bg-slate-900 text-slate-400 border-slate-700"
                            }`}
                          >
                            {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : num}
                          </button>
                          <span
                            className={`text-[10px] font-semibold mt-2 transition-colors ${
                              isActive ? "text-amber-400 font-bold" : isDone ? "text-emerald-400" : "text-slate-500"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form starts */}
                <form action={formAction} noValidate>
                  {/* STEP 1: Code & Student ID */}
                  <div className={step === 1 ? "space-y-6" : "hidden"}>
                    {/* Field 1: Student ID */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <BadgeCheck className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="student_id"
                          name="student_id"
                          type="text"
                          autoComplete="off"
                          placeholder="e.g. 24060401018"
                          value={formDataValues.student_id}
                          onChange={(e) => handleChange("student_id", e.target.value)}
                          className="peer w-full h-full pl-11 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="student_id"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Student ID / College Roll
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-1">
                        Official student ID assigned by Jhenaidah Textile Engineering College.
                      </p>
                      {fieldErrors?.student_id?.[0] && (
                        <p className="text-xs text-rose-400 pl-1 font-semibold">{fieldErrors.student_id[0]}</p>
                      )}
                    </div>

                    {/* Field 2: Registration Code */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <Key className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="registration_code"
                          name="registration_code"
                          type="text"
                          autoComplete="off"
                          placeholder="e.g. JTEC-AE-8TH-2026-X9"
                          value={formDataValues.registration_code}
                          onChange={(e) => handleChange("registration_code", e.target.value)}
                          className="peer w-full h-full pl-11 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white font-mono uppercase tracking-wider text-sm font-semibold focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="registration_code"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Departmental Registration Code
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-1">
                        Provided by your department. Your batch and department are determined from this code.
                      </p>
                      {fieldErrors?.registration_code?.[0] && (
                        <p className="text-xs text-rose-400 mt-1 pl-1 font-semibold">{fieldErrors.registration_code[0]}</p>
                      )}
                    </div>

                    {clientError && (
                      <p role="alert" className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/60">
                        {clientError}
                      </p>
                    )}

                    <div className="pt-4 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => validateAndAdvance(2)}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-900 to-red-600 text-white font-semibold text-sm shadow-xl shadow-red-950/60 hover:shadow-red-900/80 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 border border-red-500/40 cursor-pointer"
                      >
                        <span>Continue to Step 2</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* STEP 2: Identity */}
                  <div className={step === 2 ? "space-y-6" : "hidden"}>
                    {/* Field 3: Full Name */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <User className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="full_name"
                          name="full_name"
                          type="text"
                          autoComplete="name"
                          placeholder="e.g. Md. Samiul Islam"
                          value={formDataValues.full_name}
                          onChange={(e) => handleChange("full_name", e.target.value)}
                          className="peer w-full h-full pl-11 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="full_name"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Full Legal Name
                        </label>
                      </div>
                      {fieldErrors?.full_name?.[0] && (
                        <p className="text-xs text-rose-400 pl-1 font-semibold">{fieldErrors.full_name[0]}</p>
                      )}
                    </div>

                    {/* Field 4: Email */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <Mail className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="e.g. student@gmail.com"
                          value={formDataValues.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          className="peer w-full h-full pl-11 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="email"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Student Email Address
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-1">
                        You'll receive verification alerts and password recovery links at this email.
                      </p>
                      {fieldErrors?.email?.[0] && (
                        <p className="text-xs text-rose-400 mt-1 pl-1 font-semibold">{fieldErrors.email[0]}</p>
                      )}
                    </div>

                    {clientError && (
                      <p role="alert" className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/60">
                        {clientError}
                      </p>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      {/* Fixed Dark Back Button */}
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-500 active:scale-95 transition-all flex items-center gap-2 cursor-pointer font-semibold text-sm shadow-md"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-300" />
                        <span>Back</span>
                      </button>
                      <Button
                        type="button"
                        onClick={() => validateAndAdvance(3)}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-900 to-red-600 text-white font-semibold text-sm shadow-xl shadow-red-950/60 hover:shadow-red-900/80 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 border border-red-500/40 cursor-pointer"
                      >
                        <span>Continue to Step 3</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* STEP 3: Security */}
                  <div className={step === 3 ? "space-y-6" : "hidden"}>
                    {/* Field 5: Password */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <Lock className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Create a strong password"
                          value={formDataValues.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          className="peer w-full h-full pl-11 pr-12 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="password"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Account Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors?.password?.[0] && (
                        <p className="text-xs text-rose-400 mt-1 pl-1 font-semibold">{fieldErrors.password[0]}</p>
                      )}
                    </div>

                    {/* Field 6: Confirm Password */}
                    <div className="space-y-1.5">
                      <div className="relative group/field h-[52px]">
                        <Lock className="w-4 h-4 text-slate-400 group-focus-within/field:text-amber-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                        <input
                          id="confirm_password"
                          name="confirm_password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-type your password"
                          value={formDataValues.confirm_password}
                          onChange={(e) => handleChange("confirm_password", e.target.value)}
                          className="peer w-full h-full pl-11 pr-12 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_20px_rgba(245,158,11,0.15)] placeholder:text-transparent focus:placeholder:text-slate-500 hover:border-slate-500 transition-all duration-200 outline-none active:scale-[0.995]"
                          required
                        />
                        <label
                          htmlFor="confirm_password"
                          className="absolute left-11 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-medium transition-all duration-200 pointer-events-none z-20 
                                     peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-4 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md peer-focus:shadow-sm
                                     peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md peer-[:not(:placeholder-shown)]:shadow-sm"
                        >
                          Confirm Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors?.confirm_password?.[0] && (
                        <p className="text-xs text-rose-400 mt-1 pl-1 font-semibold">{fieldErrors.confirm_password[0]}</p>
                      )}
                    </div>

                    {/* Interactive Live Password Rules & Dynamic Strength Meter */}
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Security Strength:</span>
                        <span className={`font-bold flex items-center gap-1.5 ${
                          satisfiedCount === 4
                            ? "text-emerald-400"
                            : satisfiedCount >= 2
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {satisfiedCount === 4
                            ? "Strong Password"
                            : satisfiedCount >= 2
                            ? "Moderate (Needs more rules)"
                            : "Weak (Fulfill rules below)"}
                        </span>
                      </div>

                      {/* Animated Multi-Segment Bar */}
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            satisfiedCount === 4
                              ? "w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : satisfiedCount === 3
                              ? "w-3/4 bg-amber-500"
                              : satisfiedCount === 2
                              ? "w-1/2 bg-amber-600"
                              : satisfiedCount === 1
                              ? "w-1/4 bg-rose-500"
                              : "w-0"
                          }`}
                        />
                      </div>

                      {/* Live Criteria Rules Checklist */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className={`flex items-center gap-1.5 transition-colors ${
                          pwdCriteria.length ? "text-emerald-400 font-semibold" : "text-slate-500"
                        }`}>
                          {pwdCriteria.length ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3 h-3 text-slate-600" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${
                          pwdCriteria.upper ? "text-emerald-400 font-semibold" : "text-slate-500"
                        }`}>
                          {pwdCriteria.upper ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3 h-3 text-slate-600" />}
                          <span>Uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${
                          pwdCriteria.lower ? "text-emerald-400 font-semibold" : "text-slate-500"
                        }`}>
                          {pwdCriteria.lower ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3 h-3 text-slate-600" />}
                          <span>Lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${
                          pwdCriteria.numberOrSpecial ? "text-emerald-400 font-semibold" : "text-slate-500"
                        }`}>
                          {pwdCriteria.numberOrSpecial ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-3 h-3 text-slate-600" />}
                          <span>Number or symbol (0-9, #!?)</span>
                        </div>
                      </div>
                    </div>

                    {clientError && (
                      <p role="alert" className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/60">
                        {clientError}
                      </p>
                    )}

                    <div className="pt-4 flex items-center justify-between">
                      {/* Fixed Dark Back Button */}
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-500 active:scale-95 transition-all flex items-center gap-2 cursor-pointer font-semibold text-sm shadow-md"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-300" />
                        <span>Back</span>
                      </button>
                      <Button
                        type="button"
                        onClick={() => validateAndAdvance(4)}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 border border-amber-400 cursor-pointer"
                      >
                        <span>Review Registration Receipt</span>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* STEP 4: DIGITAL REGISTRATION SLIP (CLEAN VERIFIED SLIP WITHOUT BARCODE) */}
                  <div className={step === 4 ? "space-y-6" : "hidden"}>
                    <div className="relative rounded-2xl bg-[#070D1A] border-2 border-dashed border-amber-500/40 p-6 sm:p-8 shadow-2xl text-slate-300 font-mono text-xs">
                      {/* Watermark Crest */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none font-serif text-9xl font-black text-amber-400 select-none">
                        JTEC
                      </div>

                      {/* Receipt Header */}
                      <div className="text-center pb-5 border-b border-slate-800">
                        <div className="font-serif font-extrabold text-base text-white tracking-widest uppercase">
                          Jhenaidah Textile Engineering College
                        </div>
                        <div className="text-[11px] text-amber-400 tracking-wider mt-1 font-bold">
                          STUDENT ENROLLMENT VERIFICATION SLIP
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          STATUS: READY FOR OFFICIAL CONFIRMATION
                        </div>
                      </div>

                      {/* Receipt Details Table */}
                      <div className="py-5 space-y-3.5">
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">Student ID / Roll:</span>
                          <span className="font-bold text-amber-400 font-sans text-sm">
                            {formDataValues.student_id || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">Applicant Name:</span>
                          <span className="font-bold text-white font-sans text-sm">
                            {formDataValues.full_name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">Student Email:</span>
                          <span className="text-slate-200">
                            {formDataValues.email || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">Registration Code:</span>
                          <span className="text-amber-300 tracking-wider uppercase font-bold">
                            {formDataValues.registration_code || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-400 uppercase text-[10px] font-semibold">Password Status:</span>
                          <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                            <BadgeCheck className="w-4 h-4" /> Strong & Encrypted
                          </span>
                        </div>
                      </div>

                      {/* Official Verification Seal / Footer Note (Clean, No Fake Barcode) */}
                      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-[10px]">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Official Digital Enrollment Record • JTEC Academic Platform</span>
                      </div>
                    </div>

                    {generalError && (
                      <p role="alert" className="text-xs font-semibold text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/60">
                        {generalError}
                      </p>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      {/* Edit Details Button takes user back sequentially to Step 3 */}
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-500 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold text-xs shadow-md"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Details (Step 3)</span>
                      </button>

                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-emerald-400 cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>{isPending ? "Creating account..." : "Confirm & Create Account"}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            )}

            <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-800/60 pt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-400 hover:underline font-semibold">
                Sign in to Student Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-600 py-4">
        &copy; 2026 Jhenaidah Textile Engineering College. Student Verification Gateway.
      </footer>
    </main>
  );
}
