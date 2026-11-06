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
    updated_at: string;
  };
};

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [registrationOpen, setRegistrationOpen] = useState(initialSettings.registration_open);
  const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenance_mode);
  const [maxUploadSize, setMaxUploadSize] = useState(initialSettings.max_upload_size_mb);
  const [maintenanceMessage, setMaintenanceMessage] = useState(initialSettings.maintenance_message);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await savePlatformSettings(formData);

    if (result.success) {
      setSuccess("System settings saved and applied successfully!");
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
            Allow new students to create verified accounts using valid registration codes. Turn this off after admission season.
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
            Set the maximum single file size students and faculty can upload for lecture notes, books, and question banks.
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

        {/* Maintenance Mode Control */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">System Maintenance Mode</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable only during database migrations, system upgrades, or term-end scheduled maintenance.
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
            <span className="text-sm font-medium text-foreground">Turn On Scheduled Maintenance Mode</span>
            <input
              type="checkbox"
              name="maintenance_mode"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
          </label>

          <div className="space-y-1.5">
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
    </form>
  );
}