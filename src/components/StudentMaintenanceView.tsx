"use client";

import Link from "next/link";
import { Wrench, Clock, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceProps {
  message?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export function StudentMaintenanceView({ message, startTime, endTime }: MaintenanceProps) {
  const formatTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Wrench className="w-8 h-8 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Scheduled System Maintenance
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Platform Maintenance in Progress
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          {message || "The academic platform is currently undergoing scheduled maintenance. Please check back shortly."}
        </p>

        {(formattedStart || formattedEnd) && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
            {formattedStart && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Maintenance Started:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formattedStart}</span>
              </div>
            )}
            {formattedEnd && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Estimated Completion:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{formattedEnd}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button onClick={() => window.location.reload()} className="h-9 px-4 text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Status
          </Button>
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto h-9 px-4 text-xs font-medium text-slate-600">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Return to Login
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6">
          Jhenaidah Textile Engineering College (JTEC) • Academic Services
        </p>
      </div>
    </div>
  );
}