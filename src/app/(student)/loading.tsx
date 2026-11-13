import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          {/* Subtle top progress shimmer */}
          <div className="h-0.5 w-full overflow-hidden bg-slate-900">
            <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400" />
          </div>

          <main className="flex flex-1 items-center justify-center p-6">
            <div className="flex items-center gap-3 rounded-full border border-slate-800/80 bg-[#0A1020] px-4 py-2 shadow-lg">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-400" />
              <span className="text-xs font-medium tracking-wide text-slate-400">
                Loading...
              </span>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}