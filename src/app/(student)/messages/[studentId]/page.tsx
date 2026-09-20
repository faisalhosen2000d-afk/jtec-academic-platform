import Link from "next/link";
import { redirect } from "next/navigation";
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
    throw new Error(`Conversation route error: Current student profile validation failed. userId=${user.id}; profile=${JSON.stringify(currentProfile)}; queryError=${currentProfileError?.message ?? "none"}`);
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
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              <section>
                <Link
                  href="/messages"
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  ← Back to Conversations
                </Link>

                <p className="mt-4 text-sm text-muted-foreground">
                  Student Portal
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Conversation
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  With {partnerProfile.full_name}
                </p>
              </section>

              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                {error ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
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
                    <h2 className="font-semibold text-foreground">
                      No messages yet
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Messages exchanged with this student will appear here.
                    </p>
                  </div>
                )}
              </section>

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
          </main>
        </div>
      </div>
    </div>
  );
}











