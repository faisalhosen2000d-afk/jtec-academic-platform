import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
      `}</style>
      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {/* Activity & Alerts Hero */}
              <section className="dash-stagger-1 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#18140C] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_32px_rgba(245,158,11,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/55">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                      <Bell className="h-3 w-3" />
                      Activity &amp; Alerts
                    </span>

                    <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Notifications
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      Academic notices, material approvals, and portal updates.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      {unreadCount} Unread
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1 text-xs font-semibold text-slate-200">
                      {(notifications ?? []).length} Total
                    </span>
                  </div>
                </div>
              </section>

              {error ? (
                <section className="dash-stagger-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-5 text-sm text-rose-300">
                  Notifications could not be loaded: {error.message}
                </section>
              ) : notifications && notifications.length > 0 ? (
                <div className="dash-stagger-2">
                  <StudentNotificationsList notifications={notifications} />
                </div>
              ) : (
                <section className="dash-stagger-2 rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Bell className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 font-serif text-lg font-bold text-white">
                    No notifications yet
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                    New academic notices and notifications will appear here.
                  </p>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}