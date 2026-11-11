import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <StudentSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudentHeader />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-6 animate-pulse">
            {/* Greeting Skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-md bg-muted/60" />
              <div className="h-8 w-64 rounded-lg bg-muted/80" />
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl border border-border/60 bg-card/50 p-5 flex flex-col justify-between shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-muted/70" />
                    <div className="h-9 w-9 rounded-xl bg-muted/60" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-6 w-20 rounded bg-muted/80" />
                    <div className="h-3 w-36 rounded bg-muted/50" />
                  </div>
                </div>
              ))}
            </div>

            {/* Two-Column Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 h-80 rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4 shadow-xs">
                <div className="h-5 w-36 rounded bg-muted/80" />
                <div className="h-3 w-48 rounded bg-muted/50" />
                <div className="h-44 rounded-xl bg-muted/40" />
              </div>

              <div className="lg:col-span-2 h-80 rounded-2xl border border-border/60 bg-card/50 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-40 rounded bg-muted/80" />
                  <div className="h-8 w-24 rounded-lg bg-muted/60" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="h-16 rounded-xl bg-muted/40" />
                  <div className="h-16 rounded-xl bg-muted/40" />
                  <div className="h-16 rounded-xl bg-muted/40" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
