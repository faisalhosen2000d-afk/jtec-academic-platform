import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { StudentConversationReply } from "@/components/student/StudentConversationReply";

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

  const conversationFilter = [
    `and(sender_id.eq.${user.id},recipient_id.eq.${studentId})`,
    `and(sender_id.eq.${studentId},recipient_id.eq.${user.id})`,
  ].join(",");

  const { data: messages, error } = await supabase
    .from("profile_messages")
    .select("id, sender_id, recipient_id, message, created_at")
    .or(conversationFilter)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              <section>
                <p className="text-sm text-muted-foreground">
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
                  <div className="space-y-4">
                    {messages.map((item) => {
                      const isMine = item.sender_id === user.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm">
                              {item.message}
                            </p>

                            <p
                              className={`mt-1 text-xs ${
                                isMine
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

            <StudentConversationReply recipientId={studentId} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}




