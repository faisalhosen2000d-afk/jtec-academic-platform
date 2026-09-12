import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import StudentNotificationsList from "./StudentNotificationsList";

export default async function StudentNotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      "id, type, title, body, link_url, is_read, created_at",
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <section>
                <p className="text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Notifications
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  View your academic notices and other notifications.
                </p>
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                {error ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    Notifications could not be loaded: {error.message}
                  </div>
                ) : notifications && notifications.length > 0 ? (
                  <StudentNotificationsList
                    notifications={notifications}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <h2 className="font-semibold text-foreground">
                      No notifications yet
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      New academic notices and notifications will appear here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
