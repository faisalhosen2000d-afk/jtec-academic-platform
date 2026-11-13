import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function MaterialsLoading() {
  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Hero Skeleton */}
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0B1C1E] via-[#0A1120] to-[#070C17] p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-3">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-emerald-500/20" />
                    <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-800/80" />
                    <div className="flex gap-2.5 pt-1">
                      <div className="h-7 w-40 animate-pulse rounded-full bg-slate-800/70" />
                      <div className="h-7 w-32 animate-pulse rounded-full bg-slate-800/70" />
                    </div>
                  </div>
                  <div className="h-11 w-40 animate-pulse rounded-xl bg-emerald-500/25" />
                </div>
              </div>

              {/* Search & Filter Skeleton */}
              <div className="space-y-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5">
                <div className="grid gap-4 md:grid-cols-12">
                  <div className="h-11 animate-pulse rounded-xl bg-slate-800/70 md:col-span-6" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-800/70 md:col-span-3" />
                  <div className="h-11 animate-pulse rounded-xl bg-slate-800/70 md:col-span-3" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-8 w-14 animate-pulse rounded-full bg-slate-800/70" />
                  <div className="h-8 w-16 animate-pulse rounded-full bg-slate-800/70" />
                  <div className="h-8 w-16 animate-pulse rounded-full bg-slate-800/70" />
                  <div className="h-8 w-24 animate-pulse rounded-full bg-slate-800/70" />
                </div>
              </div>

              {/* 3-Column Material Cards Skeleton */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex h-60 flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0A1020] p-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="h-6 w-14 animate-pulse rounded-md bg-slate-800/80" />
                          <div className="h-6 w-16 animate-pulse rounded-md bg-slate-800/70" />
                        </div>
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-800/70" />
                      </div>
                      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-800/80" />
                      <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-800/60" />
                    </div>
                    <div className="space-y-3 border-t border-slate-800/70 pt-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-800/80" />
                        <div className="space-y-1.5">
                          <div className="h-2.5 w-16 animate-pulse rounded bg-slate-800/60" />
                          <div className="h-3.5 w-28 animate-pulse rounded bg-slate-800/80" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-32 animate-pulse rounded bg-slate-800/60" />
                        <div className="h-7 w-16 animate-pulse rounded-lg bg-slate-800/70" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}