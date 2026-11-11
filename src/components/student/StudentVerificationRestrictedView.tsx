import Link from "next/link";
import { Lock, AlertCircle, ShieldCheck, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentVerificationRestrictedView({
  featureName = "Academic Feature",
  status = "pending",
  rejectionReason,
}: {
  featureName?: string;
  status?: string;
  rejectionReason?: string | null;
}) {
  const isRejected = status === "rejected";

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0A1020]/90 backdrop-blur-xl shadow-2xl text-center space-y-6">
      <div className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center">
        <div
          className={`absolute -inset-1 rounded-full blur-md opacity-60 ${
            isRejected
              ? "bg-gradient-to-tr from-red-600 to-amber-600"
              : "bg-gradient-to-tr from-amber-500 to-red-600 animate-pulse"
          }`}
        />
        <div className="relative w-full h-full rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center">
          {isRejected ? (
            <AlertCircle className="w-7 h-7 text-red-400" />
          ) : (
            <Lock className="w-7 h-7 text-amber-400" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-border">
          {isRejected ? (
            <span className="text-red-400">Verification Rejected</span>
          ) : (
            <span className="text-amber-400">Feature Locked • Pending ID Verification</span>
          )}
        </div>

        <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
          {featureName} is Restricted
        </h3>

        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          {isRejected ? (
            <>
              Your student identity verification was declined by college administration.
              {rejectionReason ? (
                <span className="block mt-2 font-medium text-red-300 bg-red-950/40 border border-red-500/30 p-2.5 rounded-xl">
                  Reason: {rejectionReason}
                </span>
              ) : null}
            </>
          ) : (
            "Access to this departmental module requires verified student credentials. Your uploaded Student ID Card is currently awaiting review by institutional administration."
          )}
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 text-left space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Automatic Access Unlock Policy:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
          <li>Your account was created immediately upon email verification.</li>
          <li>Once an admin approves your ID card, your Level, Term, and Department will synchronize.</li>
          <li>All curriculum materials, results, and bookmarks will unlock automatically.</li>
        </ul>
      </div>

      <div className="pt-2 flex justify-center">
        <Link href="/profile">
          <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs shadow-lg shadow-red-700/30 flex items-center gap-2 hover:from-red-500 hover:to-red-600 transition-all">
            <User className="w-4 h-4" />
            <span>View Profile & Verification Status</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
