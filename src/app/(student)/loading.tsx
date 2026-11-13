import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function StudentLoading() {
  return (
    <div className="flex min-h-screen bg-[#060A12] text-slate-100">
      <StudentSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader />

        <main className="flex-1 p-5 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl animate-pulse space-y-6">
            {/* Greeting Skeleton */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#0A1020] p-6 space-y-3">
              <div className="h-5 w-28 rounded-full bg-slate-800/80" />
              <div className="h-8 w-56 rounded-lg bg-slate-800" />
              <div className="h-3.5 w-72 rounded bg-slate-800/60" />
            </div>

            {/* Academic Info Skeleton */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#0A1020] p-6 space-y-4">
              <div className="h-5 w-44 rounded bg-slate-800" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border border-slate-800/70 bg-[#060A12] p-4 space-y-2"
                  >
                    <div className="h-3 w-20 rounded bg-slate-800/80" />
                    <div className="h-4 w-32 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-32 flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0A1020] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-20 rounded bg-slate-800/80" />
                    <div className="h-5 w-5 rounded-md bg-slate-800/70" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-24 rounded bg-slate-800" />
                    <div className="h-3 w-32 rounded bg-slate-800/60" />
                  </div>
                </div>
              ))}
            </div>

            {/* Notices Skeleton */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#0A1020] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded bg-slate-800" />
                <div className="h-9 w-32 rounded-xl bg-slate-800/80" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-16 rounded-xl bg-[#060A12]" />
                <div className="h-16 rounded-xl bg-[#060A12]" />
                <div className="h-16 rounded-xl bg-[#060A12]" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}