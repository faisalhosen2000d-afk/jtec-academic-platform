import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

type Conversation = {
  partner_id: string;
  latest_message: string;
  latest_message_created_at: string;
  unread_count: number;
};

type PartnerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default async function StudentMessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_verified")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    currentProfile.role !== "student" ||
    !currentProfile.is_verified
  ) {
    throw new Error(
      `Messages list route error: Current student profile validation failed. userId=${user.id}; profile=${JSON.stringify(
        currentProfile
      )}; queryError=${currentProfileError?.message ?? "none"}`
    );
  }

  const {
    data: conversations,
    error: conversationsError,
  } = await supabase.rpc("get_student_conversations");

  if (conversationsError) {
    throw new Error(
      `Messages list route error: Conversation query failed. ${conversationsError.message}`
    );
  }

  const conversationRows = (conversations ?? []) as unknown as Conversation[];

  const partnerProfiles = await Promise.all(
    conversationRows.map(async (conversation) => {
      const { data, error } = await supabase.rpc(
        "get_public_contact_profile",
        { p_profile_id: conversation.partner_id }
      );

      if (error) {
        throw new Error(
          `Messages list route error: Partner profile query failed. partnerId=${conversation.partner_id}; error=${error.message}`
        );
      }

      return {
        conversation,
        profile: (data?.[0] ?? null) as PartnerProfile | null,
      };
    })
  );

  const items = partnerProfiles.filter(
    (
      item
    ): item is {
      conversation: Conversation;
      profile: PartnerProfile;
    } => Boolean(item.profile)
  );

  const totalUnread = items.reduce(
    (acc, item) => acc + (item.conversation.unread_count > 0 ? 1 : 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
      `}</style>
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {/* Student Inbox Hero */}
              <section className="dash-stagger-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#091922] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_32px_rgba(6,182,212,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/55">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                      <MessageSquare className="h-3 w-3" />
                      Student Inbox
                    </span>

                    <h1 className="mt-2.5 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Conversations
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      Direct academic messages with your classmates &amp; contributors.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {totalUnread > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-300">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        {totalUnread} Unread
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-[#0B1324] px-3 py-1 text-xs font-semibold text-slate-200">
                      {items.length} {items.length === 1 ? "Thread" : "Threads"}
                    </span>
                  </div>
                </div>
              </section>

              {items.length === 0 ? (
                <section className="dash-stagger-2 rounded-2xl border border-dashed border-slate-800 bg-[#0A1020]/70 p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-serif text-lg font-bold text-white">
                    No conversations yet
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
                    Message any material uploader from Study Vault and your conversations will appear here.
                  </p>
                  <Link
                    href="/materials"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Browse Materials
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </section>
              ) : (
                <section className="dash-stagger-2 overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
                  {items.map(({ conversation, profile }, index) => {
                    const isUnread = conversation.unread_count > 0;
                    return (
                      <Link
                        key={conversation.partner_id}
                        href={`/messages/${conversation.partner_id}`}
                        style={{
                          animation: "dashFadeUp 0.4s ease-out both",
                          animationDelay: `${Math.min(index, 10) * 45 + 100}ms`,
                        }}
                        className={`group flex items-center gap-4 border-b border-slate-800/80 px-5 py-4 transition-all duration-150 last:border-b-0 ${
                          isUnread
                            ? "border-l-2 border-l-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10"
                            : "hover:bg-[#0D162B]"
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-bold ${
                            isUnread
                              ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200 ring-2 ring-cyan-500/20"
                              : "border-slate-700 bg-slate-800 text-slate-200"
                          }`}
                        >
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.full_name ?? "Student"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (profile.full_name?.trim().charAt(0) ?? "S").toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-cyan-200">
                              {profile.full_name ?? "Student"}
                            </p>
                            <time
                              suppressHydrationWarning
                              dateTime={conversation.latest_message_created_at}
                              className="shrink-0 text-[11px] text-slate-400"
                            >
                              {new Date(
                                conversation.latest_message_created_at
                              ).toLocaleDateString()}
                            </time>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p
                              className={`truncate text-xs sm:text-sm ${
                                isUnread
                                  ? "font-semibold text-slate-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {conversation.latest_message}
                            </p>

                            <div className="flex shrink-0 items-center gap-2">
                              {isUnread && (
                                <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  {conversation.unread_count} new
                                </span>
                              )}
                              <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}