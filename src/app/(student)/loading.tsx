import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-8 w-56 animate-pulse rounded bg-muted" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="h-28 animate-pulse rounded-xl border border-border bg-background shadow-sm" />
                <div className="h-28 animate-pulse rounded-xl border border-border bg-background shadow-sm" />
                <div className="h-28 animate-pulse rounded-xl border border-border bg-background shadow-sm" />
                <div className="h-28 animate-pulse rounded-xl border border-border bg-background shadow-sm" />
              </div>

              <div className="h-64 animate-pulse rounded-xl border border-border bg-background shadow-sm" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}