"use client";

import { useState } from "react";
import { savePlatformSettings } from "./actions";
import { Button } from "@/components/ui/button";

type SettingsFormProps = {
  initialSettings: {
    registration_open: boolean;
    max_upload_size_mb: number;
    maintenance_mode: boolean;
    maintenance_message: string;
    maintenance_start_time: string | null;
    maintenance_end_time: string | null;
    maintenance_bypass_student_ids?: string | null;
    updated_at: string;
  };
};

function toLocalInputString(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    // Convert to Bangladesh Time (UTC+6) for datetime-local input display
    const bdTime = new Date(d.getTime() + 6 * 60 * 60 * 1000);
    return bdTime.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [registrationOpen, setRegistrationOpen] = useState(initialSettings.registration_open);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(initialSettings.max_upload_size_mb || 25);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenance_mode);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    initialSettings.maintenance_message ||
      "The academic platform is currently undergoing scheduled maintenance. Please check back shortly."
  );
  const [startTime, setStartTime] = useState(toLocalInputString(initialSettings.maintenance_start_time));
  const [endTime, setEndTime] = useState(toLocalInputString(initialSettings.maintenance_end_time));
  const [bypassIds, setBypassIds] = useState(initialSettings.maintenance_bypass_student_ids || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Smart midnight check: if endTime is earlier than startTime on the same date, advance endTime by 1 day
    let finalEndTime = endTime || null;
    if (startTime && endTime) {
      const s = new Date(`${startTime}+06:00`);
      const e = new Date(`${endTime}+06:00`);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) {
        const nextDay = new Date(e.getTime() + 24 * 60 * 60 * 1000);
        const bdNext = new Date(nextDay.getTime() + 6 * 60 * 60 * 1000);
        finalEndTime = bdNext.toISOString().slice(0, 16);
        setEndTime(finalEndTime);
      }
    }

    const result = await savePlatformSettings({
      registration_open: registrationOpen,
      max_upload_size_mb: Number(maxUploadSizeMb),
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
      maintenance_start_time: startTime || null,
      maintenance_end_time: finalEndTime,
      maintenance_bypass_student_ids: bypassIds.trim() || null,
    });

    if (result.success) {
      setSuccess("System settings saved and applied immediately across the platform!");
      setTimeout(() => setSuccess(""), 5000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Registration Gate */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Student Registration Gate</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                registrationOpen
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {registrationOpen ? "Open" : "Closed"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Allow new students to register using valid department registration codes. Turn this off when admissions close.
          </p>
          <label className="flex items-center justify-between rounded-xl border p-4 cursor-pointer hover:bg-muted/40 transition">
            <span className="text-sm font-semibold">Accept New Registrations</span>
            <input
              type="checkbox"
              name="registration_open"
              checked={registrationOpen}
              onChange={(e) => setRegistrationOpen(e.target.checked)}
              className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Maximum Upload Size */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Maximum Upload Size</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {maxUploadSizeMb} MB Limit
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Directly sets the max file upload size for all students on the upload material page and API endpoints.
          </p>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select Maximum File Boundary
            </label>
            <select
              name="max_upload_size_mb"
              value={maxUploadSizeMb}
              onChange={(e) => setMaxUploadSizeMb(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border bg-background text-sm font-medium"
            >
              <option value={10}>10 MB per file (Compact)</option>
              <option value={25}>25 MB per file (Strict)</option>
              <option value={50}>50 MB per file (Balanced)</option>
              <option value={100}>100 MB per file (Recommended Standard)</option>
              <option value={200}>200 MB per file (Large Archives)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scheduled System Maintenance Mode */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Scheduled System Maintenance Mode</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure scheduled maintenance window with exact start time and estimated completion time.
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              maintenanceMode
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {maintenanceMode ? "Active" : "Normal"}
          </span>
        </div>

        <label className="flex items-center justify-between rounded-xl border p-4 cursor-pointer hover:bg-muted/40 transition">
          <div>
            <div className="text-sm font-semibold">Turn On Maintenance Window</div>
            <div className="text-xs text-muted-foreground">
              Students see the notice below until maintenance is turned off or window ends. (Leave times blank for immediate indefinite maintenance).
            </div>
          </div>
          <input
            type="checkbox"
            name="maintenance_mode"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Maintenance Start Time (Optional)
              </label>
              {startTime && (
                <button
                  type="button"
                  onClick={() => setStartTime("")}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              name="maintenance_start_time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border bg-background text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated Completion Time (End Time)
              </label>
              {endTime && (
                <button
                  type="button"
                  onClick={() => setEndTime("")}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              name="maintenance_end_time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border bg-background text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notice Shown to Students
          </label>
          <textarea
            name="maintenance_message"
            rows={3}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            className="w-full p-3 rounded-xl border bg-background text-sm"
          />
        </div>

        {/* Authorized Test Student IDs INSIDE the card and form */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Authorized Test Student IDs (Maintenance Bypass)
            </label>
            <span className="text-[11px] text-muted-foreground">Comma-separated</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Only these specific Student IDs will bypass the maintenance screen and access the student dashboard for live testing while all other students remain blocked.
          </p>
          <input
            type="text"
            name="maintenance_bypass_student_ids"
            value={bypassIds}
            onChange={(e) => setBypassIds(e.target.value)}
            placeholder="e.g. 24060401021, 20210001999"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
          className="h-11 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold"
        >
          {loading ? "Saving Changes..." : "Save System Settings"}
        </Button>
      </div>
    </form>
  );
}