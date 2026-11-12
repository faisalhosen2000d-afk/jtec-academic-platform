"use client";

import Link from "next/link";
import { useState, useRef, useActionState } from "react";
import { signUp, type AuthActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  CheckCheck, 
  Edit3, 
  GraduationCap,
  Eye,
  EyeOff,
  UploadCloud,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

const initialState: AuthActionResult = { success: false, error: "" };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: AuthActionResult, formData: FormData) => {
      if (idCardFile) {
        formData.set("id_card_image", idCardFile);
      }
      return signUp(formData);
    },
    initialState,
  );

  const [step, setStep] = useState<number>(1);
  const [clientError, setClientError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // File state for ID card
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Controlled values for Step 4 receipt preview
  const [formDataValues, setFormDataValues] = useState({
    student_id: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormDataValues((prev) => ({ ...prev, [field]: value }));
    setClientError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setClientError("ID Card image must be in JPEG, PNG, or WebP format.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setClientError("File size exceeds 5MB limit. Please upload a smaller photo.");
      return;
    }

    setIdCardFile(file);
    const url = URL.createObjectURL(file);
    setIdCardPreview(url);
  };

  const validateAndAdvance = (targetStep: number) => {
    setClientError("");
    if (targetStep === 2) {
      if (!formDataValues.student_id.trim()) {
        setClientError("Please enter your Student ID / Roll number.");
        return;
      }
      if (!idCardFile) {
        setClientError("Please upload a clear photo of your Student ID Card.");
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
    "Enter your Student ID and upload your official ID card photo.",
    "Enter your full legal name and institutional email address.",
    "Choose a strong password to protect your academic records.",
    "Review your institutional registration details before submission.",
  ];

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#050811] text-slate-100 selection:bg-brand-red selection:text-white overflow-hidden">
      {/* Background Ambient Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 -z-10 h-96 w-96 rounded-full bg-red-600/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-xl">
        {/* Top Branding Bar */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <span className="font-serif text-xl font-black tracking-wider text-white">
              JTEC <span className="text-amber-400">ACADEMIC</span>
            </span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Student Self-Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create your account with your Student ID and upload ID card for verification.
          </p>
        </div>

        {/* Wizard Container */}
        <div className="group/auth relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[#0A1020]/95 p-6 sm:p-8 shadow-[0_0_45px_rgba(245,158,11,0.12)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_0_65px_rgba(245,158,11,0.22)]">
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
          {/* Progress Tracker (4 Steps) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Step {step} of 4: {stepTitles[step]}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {Math.round((step / 4) * 100)}% Completed
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-500 ease-out"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{stepDescriptions[step]}</p>
          </div>

          {/* Client Validation or Server Errors */}
          {(clientError || generalError) && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{clientError || generalError}</span>
            </div>
          )}

          {/* REGISTRATION FORM */}
          <form action={formAction}>
            {/* Hidden fields to retain state across steps in native FormData */}
            <input type="hidden" name="student_id" value={formDataValues.student_id} />
            <input type="hidden" name="full_name" value={formDataValues.full_name} />
            <input type="hidden" name="email" value={formDataValues.email} />
            <input type="hidden" name="password" value={formDataValues.password} />
            <input type="hidden" name="confirm_password" value={formDataValues.confirm_password} />

            {/* STEP 1: Institutional Verification & Student ID Card */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Student ID Input */}
                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={formDataValues.student_id}
                      onChange={(e) => handleChange("student_id", e.target.value)}
                      placeholder=" "
                      className="peer h-full w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-4 text-sm font-medium text-white placeholder-transparent transition-all duration-200 focus:border-amber-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-slate-500"
                    />
                    <label className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium transition-all duration-200 z-20 
                                       peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md
                                       peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md">
                      Student ID / College Roll
                    </label>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    Official Student ID assigned by the institution (e.g. 24060401018).
                  </p>
                </div>

                {/* Student ID Card Photo Upload Box */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Student ID Card Photo (For Admin Verification)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group/drop relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-950/60 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="id_card_image"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {idCardPreview ? (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <div className="relative w-full max-w-xs h-36 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
                          <img
                            src={idCardPreview}
                            alt="Student ID Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                          <span>{idCardFile?.name} (Click to change photo)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2.5 text-amber-400 group-hover/drop:scale-110 transition-transform">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-200">
                          Click or drag photo here to upload
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Clear front-side photo showing ID, Name & Department (Max 5MB • JPEG, PNG, WebP)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advance Button */}
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(2)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-bold text-white shadow-lg shadow-red-700/30 hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Identity Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: Personal Identity Details */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Full Legal Name */}
                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={formDataValues.full_name}
                      onChange={(e) => handleChange("full_name", e.target.value)}
                      placeholder=" "
                      className="peer h-full w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-4 text-sm font-medium text-white placeholder-transparent transition-all duration-200 focus:border-amber-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-slate-500"
                    />
                    <label className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium transition-all duration-200 z-20 
                                       peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md
                                       peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md">
                      Full Legal Name
                    </label>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    Your full name matching institutional records.
                  </p>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={formDataValues.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder=" "
                      className="peer h-full w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-4 text-sm font-medium text-white placeholder-transparent transition-all duration-200 focus:border-amber-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-slate-500"
                    />
                    <label className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium transition-all duration-200 z-20 
                                       peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md
                                       peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md">
                      Institutional / Personal Email
                    </label>
                  </div>
                  <p className="px-1 text-[11px] text-slate-500">
                    A confirmation link will be sent to this email address.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 h-11 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => validateAndAdvance(3)}
                    className="w-2/3 h-11 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-bold text-white shadow-lg shadow-red-700/30 hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Account Security & Password */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Password Input */}
                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formDataValues.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder=" "
                      className="peer h-full w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-11 text-sm font-medium text-white placeholder-transparent transition-all duration-200 focus:border-amber-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-slate-500"
                    />
                    <label className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium transition-all duration-200 z-20 
                                       peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md
                                       peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md">
                      Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition-colors z-20"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1">
                  <div className="relative group/field h-[52px]">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-amber-400 z-10">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formDataValues.confirm_password}
                      onChange={(e) => handleChange("confirm_password", e.target.value)}
                      placeholder=" "
                      className="peer h-full w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-11 text-sm font-medium text-white placeholder-transparent transition-all duration-200 focus:border-amber-400 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-slate-500"
                    />
                    <label className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium transition-all duration-200 z-20 
                                       peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:left-3 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-amber-400 peer-focus:tracking-wider peer-focus:uppercase peer-focus:bg-[#0A1020] peer-focus:px-2 peer-focus:border peer-focus:border-amber-500/40 peer-focus:rounded-md
                                       peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-amber-400 peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:border peer-[:not(:placeholder-shown)]:border-amber-500/40 peer-[:not(:placeholder-shown)]:rounded-md">
                      Confirm Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 cursor-pointer transition-colors z-20"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Criteria Checklist */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Security Requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${formDataValues.password.length >= 8 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        ✓
                      </span>
                      <span className={formDataValues.password.length >= 8 ? "text-slate-200" : "text-slate-500"}>
                        8+ Characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(formDataValues.password) ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        ✓
                      </span>
                      <span className={/[A-Z]/.test(formDataValues.password) ? "text-slate-200" : "text-slate-500"}>
                        Uppercase Letter
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[a-z]/.test(formDataValues.password) ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        ✓
                      </span>
                      <span className={/[a-z]/.test(formDataValues.password) ? "text-slate-200" : "text-slate-500"}>
                        Lowercase Letter
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${/[0-9!@#$%^&*]/.test(formDataValues.password) ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                        ✓
                      </span>
                      <span className={/[0-9!@#$%^&*]/.test(formDataValues.password) ? "text-slate-200" : "text-slate-500"}>
                        Number or Symbol
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 h-11 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => validateAndAdvance(4)}
                    className="w-2/3 h-11 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-bold text-white shadow-lg shadow-red-700/30 hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Review Summary Slip</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Digital Registration Summary Slip */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Money receipt style summary card */}
                <div className="relative rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        Official Academic Record
                      </span>
                      <h3 className="font-serif text-lg font-bold text-white">
                        Registration Summary Slip
                      </h3>
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Pending Verification</span>
                    </div>
                  </div>

                  {/* Summary Rows */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Student ID / Roll:</span>
                      <span className="font-bold text-white">{formDataValues.student_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Full Legal Name:</span>
                      <span className="font-bold text-white">{formDataValues.full_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Account Email:</span>
                      <span className="font-bold text-white">{formDataValues.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Initial Access State:</span>
                      <span className="font-semibold text-amber-400">Dashboard & Profile (Academic Features Locked)</span>
                    </div>
                  </div>

                  {/* ID Card Thumbnail */}
                  {idCardPreview && (
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                        Uploaded ID Card Photo:
                      </span>
                      <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                        <img
                          src={idCardPreview}
                          alt="Uploaded ID Card Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Institutional Verification Notice */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-amber-400">Important Note on Academic Access:</p>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      Your account will be created immediately upon email confirmation. You can log in and view your profile while an administrator verifies your student ID card. Once approved, your department, level, and term will unlock automatically.
                    </p>
                  </div>
                </div>

                {/* Final Submission Buttons */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 cursor-pointer rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 font-bold text-white shadow-[0_0_24px_rgba(220,38,38,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_32px_rgba(220,38,38,0.55)] active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Uploading ID Card & Creating Account...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Submit Registration for Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isPending}
                    className="w-full h-10 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Registration Details</span>
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Success Dialog */}
          {state.success && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-bold text-white">
                    Registration Submitted!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A confirmation link has been sent to your email address. Please click the link to activate your account.
                  </p>
                  <p className="text-xs text-amber-400/90 leading-relaxed pt-1">
                    Once email verification is complete, you can sign in to your dashboard immediately with your Student ID while admin verifies your ID card.
                  </p>
                </div>
                <Link href="/login" className="block w-full">
                  <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-red-700 font-bold text-white shadow-lg shadow-red-700/30">
                    Proceed to Student Login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Bottom Login Link */}
          <div className="mt-8 border-t border-slate-800/80 pt-5 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-amber-400 underline decoration-amber-500/40 underline-offset-4 hover:text-amber-300 transition-colors"
              >
                Sign In to Dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}