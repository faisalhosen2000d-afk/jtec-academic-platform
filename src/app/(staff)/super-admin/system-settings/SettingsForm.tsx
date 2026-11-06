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

function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [registrationOpen, setRegistrationOpen] = useState(initialSettings.registration_open);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenance_mode);
  const [maxUploadSize, setMaxUploadSize] = useState(initialSettings.max_upload_size_mb);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initialSettings.maintenance_message);
  const [bypassStudentIds, setBypassStudentIds] = useState(initialSettings.maintenance_bypass_student_ids || "");
  const [startTime, setStartTime] = useState(toLocalDatetimeString(initialSettings.maintenance_start_time));
  const [endTime, setEndTime] = useState(toLocalDatetimeString(initialSettings.maintenance_end_time));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await savePlatformSettings(formData);

    if (result.success) {
      setSuccess("System settings saved and applied successfully across the platform!");
      setTimeout(() => setSuccess(""), 4000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Registration Toggle */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Student Registration Gate</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                registrationOpen
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {registrationOpen ? "Open" : "Paused"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Allow new students to register using valid department registration codes. Turn this off when admissions close.
          </p>

          <label className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 cursor-pointer hover:bg-muted/40 transition">
            <span className="text-sm font-medium text-foreground">Accept New Registrations</span>
            <input
              type="checkbox"
              name="registration_open"
              checked={registrationOpen}
              onChange={(e) => setRegistrationOpen(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
          </label>
        </section>

        {/* Max Upload Size Limit */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Maximum Upload Size</h2>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              {maxUploadSize} MB Limit
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Directly sets the max file upload size for all students on the upload material page and API endpoints.
          </p>

          <div className="space-y-2">
            <label htmlFor="max_upload_size_mb" className="block text-xs font-semibold text-muted-foreground uppercase">
              Select Maximum File Boundary
            </label>
            <select
              id="max_upload_size_mb"
              name="max_upload_size_mb"
              value={maxUploadSize}
              onChange={(e) => setMaxUploadSize(parseInt(e.target.value, 10))}
              className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="25">25 MB per file (Strict)</option>
              <option value="50">50 MB per file (Moderate)</option>
              <option value="100">100 MB per file (Recommended Standard)</option>
              <option value="150">150 MB per file (High Capacity)</option>
              <option value="200">200 MB per file (Maximum)</option>
            </select>
          </div>
        </section>

        {/* Scheduled Maintenance Mode Control with Start & End Time */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Scheduled System Maintenance Mode</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure scheduled maintenance window with exact start time and estimated completion time.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                maintenanceMode
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {maintenanceMode ? "Active" : "Normal"}
            </span>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4 cursor-pointer hover:bg-muted/40 transition">
            <div>
              <span className="text-sm font-medium text-foreground block">Turn On Maintenance Window</span>
              <span className="text-xs text-muted-foreground">Students see the notice below until maintenance is turned off or window ends.</span>
            </div>
            <input
              type="checkbox"
              name="maintenance_mode"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="maintenance_start_time" className="text-xs font-semibold text-muted-foreground uppercase">
                Maintenance Start Time
              </label>
              <input
                id="maintenance_start_time"
                name="maintenance_start_time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="maintenance_end_time" className="text-xs font-semibold text-muted-foreground uppercase">
                Estimated Completion Time (End Time)
              </label>
              <input
                id="maintenance_end_time"
                name="maintenance_end_time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label htmlFor="maintenance_message" className="text-xs font-semibold text-muted-foreground uppercase">
              Notice Shown to Students
            </label>
            <textarea
              id="maintenance_message"
              name="maintenance_message"
              rows={2}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed text-foreground focus:ring-2 focus:ring-primary"
            />
          </div>
        </section>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="h-11 px-8 rounded-xl text-sm font-semibold shadow-md transition hover:scale-[1.01]"
        >
          {loading ? "Applying Settings..." : "Save System Settings"}
        </Button>
      </div>
    
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Authorized Test Student IDs (Maintenance Bypass)</span>
            <span className="text-[11px] font-normal text-muted-foreground lowercase">comma-separated</span>
          </label>
          <p className="text-xs text-muted-foreground">
            These student IDs can log in and view the full student portal even during maintenance for live testing.
          </p>
          <input
            type="text"
            name="maintenance_bypass_student_ids"
            value={bypassStudentIds} onChange={(e) => setBypassStudentIds(e.target.value)}
            placeholder="e.g. 20210001042, 20210001999"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </form>
  );
}