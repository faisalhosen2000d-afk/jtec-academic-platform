"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  HardDrive,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wrench,
} from "lucide-react";
import { savePlatformSettings } from "./actions";
import type { B2BandwidthStatus } from "@/lib/b2-bandwidth";
import type { R2UsageStats } from "@/lib/material-storage";
import {
  DEFAULT_STORAGE_ROUTING_RULES,
  type StorageProviderMode,
  type StorageRoutingRules,
  type StorageSectionKey,
} from "@/lib/platform-settings";
import { ModernDateTimePicker } from "@/components/ui/ModernDateTimePicker";

type SettingsFormProps = {
  initialSettings: {
    registration_open: boolean;
    max_upload_size_mb: number;
    material_storage_provider?: "b2" | "supabase" | "r2" | "smart_auto";
    storage_routing_rules?: StorageRoutingRules;
    maintenance_mode: boolean;
    maintenance_message: string;
    maintenance_start_time: string | null;
    maintenance_end_time: string | null;
    maintenance_bypass_student_ids?: string | null;
    updated_at: string;
  };
  b2Configured?: boolean;
  r2Configured?: boolean;
  b2Bandwidth?: B2BandwidthStatus;
  r2Usage?: R2UsageStats;
};

const UPLOAD_OPTIONS = [
  { value: 10, label: "10 MB per file (Compact)" },
  { value: 25, label: "25 MB per file (Strict)" },
  { value: 50, label: "50 MB per file (Balanced)" },
  { value: 100, label: "100 MB per file (Recommended Standard)" },
  { value: 200, label: "200 MB per file (Large Archives)" },
];

const CUTOFF_OPTIONS = [1, 1.5, 2, 3, 5];

const STORAGE_SECTIONS: Array<{
  key: StorageSectionKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: "materials",
    title: "Study Materials",
    subtitle: "PDF notes, books, slides & student uploads",
  },
  {
    key: "questions",
    title: "Question Bank",
    subtitle: "Previous year question papers & exam sets",
  },
  {
    key: "notices",
    title: "Notices & Circulars",
    subtitle: "Official notice PDFs & image attachments",
  },
  {
    key: "schedules",
    title: "Schedules & Routines",
    subtitle: "Class routines & exam schedules",
  },
];

const MODE_OPTIONS: Array<{
  value: StorageProviderMode;
  label: string;
}> = [
  { value: "smart_auto", label: "Smart Auto" },
  { value: "r2", label: "R2 Only" },
  { value: "b2", label: "B2 Only" },
  { value: "supabase", label: "Supabase" },
];

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toLocalInputString(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    const bdTime = new Date(d.getTime() + 6 * 60 * 60 * 1000);
    return bdTime.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function ToggleSwitch({
  checked,
  onChange,
  accent = "emerald",
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  accent?: "emerald" | "amber";
  label: string;
}) {
  const activeBg =
    accent === "amber"
      ? "bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.45)]"
      : "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.45)]";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all duration-200 ${
        checked ? activeBg : "border-slate-600 bg-slate-800"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsForm({
  initialSettings,
  b2Configured = true,
  r2Configured = false,
  b2Bandwidth,
  r2Usage,
}: SettingsFormProps) {
  const [registrationOpen, setRegistrationOpen] = useState(
    initialSettings.registration_open,
  );
  const [routingRules, setRoutingRules] = useState<StorageRoutingRules>(
    initialSettings.storage_routing_rules ?? DEFAULT_STORAGE_ROUTING_RULES,
  );
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(
    initialSettings.max_upload_size_mb || 25,
  );
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);

  const [maintenanceMode, setMaintenanceMode] = useState(
    initialSettings.maintenance_mode,
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialSettings.maintenance_message ||
      "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.",
  );
  const [startTime, setStartTime] = useState(
    toLocalInputString(initialSettings.maintenance_start_time),
  );
  const [endTime, setEndTime] = useState(
    toLocalInputString(initialSettings.maintenance_end_time),
  );
  const [bypassIds, setBypassIds] = useState(
    initialSettings.maintenance_bypass_student_ids || "",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(e.target as Node)
      ) {
        setUploadMenuOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setUploadMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function updateSectionMode(section: StorageSectionKey, mode: StorageProviderMode) {
    setRoutingRules((prev) => ({
      ...prev,
      [section]: { ...prev[section], mode },
    }));
  }

  function updateSectionCutoff(section: StorageSectionKey, cutoff_mb: number) {
    setRoutingRules((prev) => ({
      ...prev,
      [section]: { ...prev[section], cutoff_mb },
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    let finalEndTime = endTime || null;
    if (startTime && endTime) {
      const s = new Date(`${startTime}+06:00`);
      const e = new Date(`${endTime}+06:00`);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e < s) {
        const nextDay = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        const bdNext = new Date(nextDay.getTime() + 6 * 60 * 60 * 1000);
        finalEndTime = bdNext.toISOString().slice(0, 16);
        setEndTime(finalEndTime);
      }
    }

    const result = await savePlatformSettings({
      registration_open: registrationOpen,
      max_upload_size_mb: Number(maxUploadSizeMb),
      storage_routing_rules: routingRules,
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
      maintenance_start_time: startTime || null,
      maintenance_end_time: finalEndTime,
      maintenance_bypass_student_ids: bypassIds.trim() || null,
    });

    if (result.success) {
      setSuccess(
        "System settings saved and applied immediately across the platform!",
      );
      setTimeout(() => setSuccess(""), 5000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  const selectedUploadOption =
    UPLOAD_OPTIONS.find((o) => o.value === maxUploadSizeMb) ??
    UPLOAD_OPTIONS[1];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(16,185,129,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Registration Gate
          </p>
          <p
            className={`mt-2 font-serif text-2xl font-bold ${
              registrationOpen ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {registrationOpen ? "Open" : "Closed"}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(6,182,212,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Max Upload Limit
          </p>
          <p className="mt-2 font-serif text-2xl font-bold text-cyan-300">
            {maxUploadSizeMb} MB
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(245,158,11,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Maintenance Mode
          </p>
          <p
            className={`mt-2 font-serif text-2xl font-bold ${
              maintenanceMode ? "text-amber-300" : "text-slate-300"
            }`}
          >
            {maintenanceMode ? "Active" : "Normal"}
          </p>
        </div>
      </section>

      {/* Dynamic Multi-Cloud Storage Router */}
      <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-[#0A1020] p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/15 text-cyan-300">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Dynamic Section-Wise Storage Router
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Route files dynamically between Cloudflare R2 (10 GB free, unlimited downloads), Backblaze B2 (10 GB free, 1 GB/day bandwidth), and Supabase. Existing files stay 100% readable regardless of rule changes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                r2Configured
                  ? "border-orange-400/40 bg-orange-500/15 text-orange-300"
                  : "border-slate-700 bg-slate-800/80 text-slate-400"
              }`}
            >
              R2: {r2Configured ? "Connected" : "Not Configured"}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                b2Configured
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                  : "border-slate-700 bg-slate-800/80 text-slate-400"
              }`}
            >
              B2: {b2Configured ? "Connected" : "Not Configured"}
            </span>
          </div>
        </div>

        {/* Live Cloud Health Meters */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Cloudflare R2 Live Storage Meter */}
          <div className="rounded-xl border border-slate-800/90 bg-[#060A12] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  Cloudflare R2 Storage
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r2Usage?.hardLimitReached
                      ? "bg-rose-500/20 text-rose-300"
                      : (r2Usage?.percentOfFreeTier ?? 0) >= 80
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {r2Usage?.hardLimitReached
                    ? "9.5 GB Lock Active"
                    : `${r2Usage?.percentOfFreeTier ?? 0}% Used`}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                {formatBytes(r2Usage?.usedBytes ?? 0)} / 10.0 GB · {r2Usage?.objectCount ?? 0} files
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                style={{ width: `${Math.min(100, r2Usage?.percentOfFreeTier ?? 0)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  r2Usage?.hardLimitReached
                    ? "bg-rose-500"
                    : (r2Usage?.percentOfFreeTier ?? 0) >= 80
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-orange-400 to-amber-300"
                }`}
              />
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>
                Card-Safe Hard Lock at <strong className="text-slate-200">9.5 GB</strong> (auto-failover to B2 before $0 free tier ends).
              </span>
            </div>
          </div>

          {/* Backblaze B2 Daily Bandwidth Meter */}
          {b2Bandwidth && (
            <div className="rounded-xl border border-slate-800/90 bg-[#060A12] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    Backblaze B2 Daily Bandwidth ({b2Bandwidth.dayUtc})
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      b2Bandwidth.status === "exceeded"
                        ? "bg-rose-500/20 text-rose-300"
                        : b2Bandwidth.status === "warning"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {b2Bandwidth.percentUsed}% Used
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {(b2Bandwidth.bytesUsed / (1024 * 1024)).toFixed(1)} MB / 1024 MB · {b2Bandwidth.requestsCount} hits
                </span>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${Math.min(100, b2Bandwidth.percentUsed)}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    b2Bandwidth.status === "exceeded"
                      ? "bg-rose-500"
                      : b2Bandwidth.status === "warning"
                        ? "bg-amber-400"
                        : "bg-gradient-to-r from-emerald-400 to-cyan-400"
                  }`}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Auto-failover to R2 at 80% daily usage.</span>
                <span className="font-mono">Resets 6:00 AM BDT</span>
              </div>
            </div>
          )}
        </div>

        {/* Per-Section Routing Rules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Per-Section Upload Routing Rules</span>
          </div>

          <div className="grid gap-3">
            {STORAGE_SECTIONS.map((sec) => {
              const rule = routingRules[sec.key];
              return (
                <div
                  key={sec.key}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-[#060A12] p-4 lg:flex-row lg:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {sec.title}
                      </span>
                      {rule.mode === "smart_auto" && (
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          &lt; {rule.cutoff_mb} MB → B2 · ≥ {rule.cutoff_mb} MB → R2
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{sec.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-800 bg-[#0A1020] p-1">
                      {MODE_OPTIONS.map((opt) => {
                        const active = rule.mode === opt.value;
                        const disabled =
                          (opt.value === "r2" && !r2Configured) ||
                          (opt.value === "b2" && !b2Configured);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => updateSectionMode(sec.key, opt.value)}
                            className={`cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                              active
                                ? opt.value === "smart_auto"
                                  ? "bg-cyan-500/20 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]"
                                  : opt.value === "r2"
                                    ? "bg-orange-500/20 text-orange-300 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.4)]"
                                    : opt.value === "b2"
                                      ? "bg-sky-500/20 text-sky-300 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.4)]"
                                      : "bg-emerald-500/20 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)]"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {rule.mode === "smart_auto" && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0A1020] px-2.5 py-1">
                        <span className="text-[11px] text-slate-400">Cutoff:</span>
                        <select
                          aria-label={`${sec.title} Smart Auto Cutoff`}
                          value={rule.cutoff_mb}
                          onChange={(e) =>
                            updateSectionCutoff(sec.key, Number(e.target.value))
                          }
                          className="cursor-pointer bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none"
                        >
                          {CUTOFF_OPTIONS.map((mb) => (
                            <option
                              key={mb}
                              value={mb}
                              className="bg-[#0A1020] text-slate-200"
                            >
                              {mb} MB
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-5 py-3.5 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-3.5 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Registration Gate */}
        <div className="space-y-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/45 hover:bg-[#0D162B] hover:shadow-[0_14px_36px_rgba(16,185,129,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 text-emerald-300">
                <UserPlus className="h-4 w-4" />
              </div>
              <h2 className="font-serif text-base font-bold text-white">
                Student Registration Gate
              </h2>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                registrationOpen
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/15 text-rose-300"
              }`}
            >
              {registrationOpen ? "Open" : "Closed"}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            Allow new students to register using valid department registration
            codes. Turn this off when admissions close.
          </p>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#060A12] px-4 py-3.5">
            <span className="text-xs font-semibold text-slate-200">
              Accept New Registrations
            </span>
            <ToggleSwitch
              checked={registrationOpen}
              onChange={setRegistrationOpen}
              accent="emerald"
              label="Accept New Registrations"
            />
          </div>
        </div>

        {/* Maximum Upload Size */}
        <div className="space-y-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/45 hover:bg-[#0D162B] hover:shadow-[0_14px_36px_rgba(6,182,212,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/15 text-cyan-300">
                <HardDrive className="h-4 w-4" />
              </div>
              <h2 className="font-serif text-base font-bold text-white">
                Maximum Upload Size
              </h2>
            </div>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
              {maxUploadSizeMb} MB Limit
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            Directly sets the max file upload size for all students on the
            upload material page and API endpoints.
          </p>

          <div ref={uploadMenuRef} className="relative space-y-1.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Select Maximum File Boundary
            </span>
            <button
              type="button"
              onClick={() => setUploadMenuOpen((o) => !o)}
              className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border bg-[#060A12] px-3.5 text-xs font-semibold text-white transition-all ${
                uploadMenuOpen
                  ? "border-cyan-400/80 ring-2 ring-cyan-500/20"
                  : "border-slate-700/80 hover:border-slate-600"
              }`}
            >
              <span>{selectedUploadOption?.label}</span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${
                  uploadMenuOpen ? "rotate-180 text-cyan-300" : ""
                }`}
              />
            </button>

            {uploadMenuOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
                {UPLOAD_OPTIONS.map((opt) => {
                  const active = opt.value === maxUploadSizeMb;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setMaxUploadSizeMb(opt.value);
                        setUploadMenuOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        active
                          ? "bg-cyan-500/20 font-semibold text-cyan-300"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 text-cyan-300" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Scheduled System Maintenance Mode */}
      <section className="space-y-5 rounded-2xl border border-amber-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/55 hover:bg-[#0D162B] hover:shadow-[0_14px_36px_rgba(245,158,11,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-300">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Scheduled System Maintenance Mode
              </h2>
              <p className="text-xs text-slate-400">
                Configure scheduled maintenance window with exact start time and
                estimated completion time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#060A12] px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-200">
              Turn On Maintenance
            </span>
            <ToggleSwitch
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
              accent="amber"
              label="Turn On Maintenance Window"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="maintenance_start_time"
              className="block text-xs font-semibold text-slate-300"
            >
              Maintenance Start Time (Optional · BDT)
            </label>
            <ModernDateTimePicker
              id="maintenance_start_time"
              name="maintenance_start_time"
              defaultValue={startTime}
              onChange={setStartTime}
              placeholder="No scheduled start"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="maintenance_end_time"
              className="block text-xs font-semibold text-slate-300"
            >
              Estimated Completion Time (Optional · BDT)
            </label>
            <ModernDateTimePicker
              id="maintenance_end_time"
              name="maintenance_end_time"
              defaultValue={endTime}
              onChange={setEndTime}
              placeholder="No scheduled end"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="maintenance_message"
            className="block text-xs font-semibold text-slate-300"
          >
            Notice Shown to Students
          </label>
          <textarea
            id="maintenance_message"
            name="maintenance_message"
            rows={3}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Enter custom message to show students during maintenance..."
            className="w-full rounded-xl border border-slate-700/80 bg-[#060A12] p-3.5 text-xs text-white placeholder:text-slate-500 transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="space-y-1.5 border-t border-slate-800/80 pt-4">
          <label
            htmlFor="maintenance_bypass_student_ids"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>
              Authorized Test Student IDs (Maintenance Bypass · Comma-separated)
            </span>
          </label>
          <input
            id="maintenance_bypass_student_ids"
            name="maintenance_bypass_student_ids"
            type="text"
            value={bypassIds}
            onChange={(e) => setBypassIds(e.target.value)}
            placeholder="e.g. 24060401021, 20210001999 (comma-separated)"
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 font-mono text-xs text-white placeholder:text-slate-500 transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <p className="text-[11px] text-slate-400">
            Only these specific Student IDs will bypass the maintenance screen so
            you can verify student features safely during lockdown.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-6 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(6,182,212,0.3)] transition-all duration-150 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{loading ? "Saving Changes..." : "Save System Settings"}</span>
        </button>
      </div>
    </form>
  );
}