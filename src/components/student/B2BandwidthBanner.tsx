import { AlertTriangle, Clock } from "lucide-react";
import type { B2BandwidthStatus } from "@/lib/b2-bandwidth";

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export default function B2BandwidthBanner({
  status,
}: {
  status: B2BandwidthStatus;
}) {
  if (status.percentUsed < 80) return null;

  const isExceeded = status.status === "exceeded";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg ${
        isExceeded
          ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
          : "border-amber-500/40 bg-amber-500/10 text-amber-100"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              isExceeded ? "text-rose-400" : "text-amber-400"
            }`}
          />
          <div className="space-y-0.5">
            <p className="text-sm font-bold">
              {isExceeded
                ? "আজকের ফ্রি সার্ভার ডাউনলোড লিমিট প্রায় শেষ (১০০%)"
                : `আজকের ফ্রি সার্ভার ব্যান্ডউইথ প্রায় শেষ (${formatMb(status.remainingBytes)} বাকি)`}
            </p>
            <p className="text-xs opacity-90">
              {isExceeded
                ? "আজকের জন্য Backblaze B2 ফ্রি কোটা শেষের পথে—কিছু বড় ফাইল ওপেন হতে সমস্যা হলে ভোর ৬টায় (BDT) লিমিট রিসেট হওয়ার পর চেষ্টা করুন।"
                : "অনেক শিক্ষার্থী একসাথে ফাইল ডাউনলোড করায় আজকের দৈনিক ১ GB কোটার ৮০%-এর বেশি ব্যবহৃত হয়েছে।"}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1 text-[11px] font-semibold sm:self-center ${
            isExceeded
              ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
              : "border-amber-400/40 bg-amber-500/15 text-amber-200"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Resets 6:00 AM BDT
        </span>
      </div>
    </div>
  );
}