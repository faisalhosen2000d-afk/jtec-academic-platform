import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { StudentConversationReply } from "@/components/student/StudentConversationReply";
import { StudentConversationMessages } from "@/components/student/StudentConversationMessages";
import { markConversationMessagesAsRead } from "@/server/actions/profile-messages";

type StudentConversationPageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function StudentConversationPage({
  params,
}: StudentConversationPageProps) {
  const { studentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (studentId === user.id) {
    throw new Error("Conversation route error: You cannot open a conversation with yourself.");
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
      `Conversation route error: Current student profile validation failed. userId=${user.id}; profile=${JSON.stringify(
        currentProfile
      )}; queryError=${currentProfileError?.message ?? "none"}`
    );
  }

  const {
    data: partnerProfileData,
    error: partnerProfileError,
  } = await supabase.rpc(
    "get_public_contact_profile",
    { p_profile_id: studentId },
  );

  const partnerProfile = partnerProfileData?.[0] ?? null;

  if (!partnerProfile) {
    throw new Error(
      `Conversation route error: Partner profile validation failed. studentId=${studentId}; profile=${JSON.stringify(
        partnerProfile
      )}; queryError=${partnerProfileError?.message ?? "none"}`
    );
  }

  await markConversationMessagesAsRead(studentId);

  const conversationFilter = [
    `and(sender_id.eq.${user.id},recipient_id.eq.${studentId})`,
    `and(sender_id.eq.${studentId},recipient_id.eq.${user.id})`,
  ].join(",");

  const { data: messages, error } = await supabase
    .from("profile_messages")
    .select("id, sender_id, recipient_id, message, created_at, read_at, material_id")
    .or(conversationFilter)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  const materialIds = Array.from(
    new Set((messages ?? []).map((item) => item.material_id).filter((id): id is string => Boolean(id))),
  );

  const { data: referencedMaterials } = materialIds.length
    ? await supabase
        .from("materials")
        .select("id, title")
        .in("id", materialIds)
        .eq("status", "approved")
    : { data: [] };

  const materialTitleById = new Map(
    (referencedMaterials ?? []).map((material) => [material.id, material.title]),
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
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
      `}</style>
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {/* Partner Thread Header */}
              <section className="dash-stagger-1 flex flex-col gap-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#091922] via-[#0A1120] to-[#070C17] p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  {partnerProfile.avatar_url ? (
                    <img
                      src={partnerProfile.avatar_url}
                      alt={partnerProfile.full_name ?? "Student"}
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-cyan-500/35"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-500/35 bg-cyan-500/15 text-base font-bold text-cyan-300">
                      {(partnerProfile.full_name?.trim().charAt(0) ?? "S").toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-cyan-300">
                      <MessageSquare className="h-3 w-3" />
                      Direct Conversation
                    </span>
                    <h1 className="truncate font-serif text-xl font-bold text-white sm:text-2xl">
                      {partnerProfile.full_name}
                    </h1>
                  </div>
                </div>

                <Link
                  href="/messages"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E172A] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All Conversations
                </Link>
              </section>

              {/* Messages Container */}
              <section className="dash-stagger-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl">
                {error ? (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-300">
                    Conversation could not be loaded: {error.message}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <StudentConversationMessages
                    messages={messages}
                    currentUserId={user.id}
                    materialTitleById={materialTitleById}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <h2 className="font-serif text-base font-bold text-white">
                      No messages yet
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400">
                      Messages exchanged with this student will appear here.
                    </p>
                  </div>
                )}
              </section>

              <div className="dash-stagger-3">
                <StudentConversationReply
                  recipientId={studentId}
                  sentMessageCount={messages?.filter((item) => item.sender_id === user.id).length ?? 0}
                  contactProfile={{
                    email: partnerProfile.email,
                    phone: partnerProfile.phone,
                    whatsapp: partnerProfile.whatsapp,
                    facebook: partnerProfile.facebook,
                    instagram: partnerProfile.instagram,
                    linkedin: partnerProfile.linkedin,
                    telegram: partnerProfile.telegram,
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}