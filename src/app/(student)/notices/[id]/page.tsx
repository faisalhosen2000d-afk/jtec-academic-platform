import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { NoticeAttachmentActions } from "@/components/notices/NoticeAttachmentActions";
import { NoticeImagePreview } from "@/components/notices/NoticeImagePreview";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NoticeDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notice, error } = await supabase
    .from("notices")
    .select(
      "id, title, content, target_scope, target_department_id, target_batch_id, target_level_id, target_term_id, is_pinned, created_at",
    )
    .eq("id", id)
    .eq("is_archived", false)
    .maybeSingle();

  const attachmentService = createServiceRoleClient();

  const { data: attachments, error: attachmentError } =
    await attachmentService
      .from("notice_attachments")
      .select("id, file_path, file_type, file_size_bytes")
      .eq("notice_id", id);

  if (attachmentError) {
    console.error("Notice attachment loading error:", attachmentError);
  }

  if (error) {
    console.error("Notice details loading error:", error);
  }

  if (!notice) {
    notFound();
  }

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
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to Dashboard
                </Link>
              </section>

              <article className="rounded-xl border border-border bg-background p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {notice.title}
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "Asia/Dhaka",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notice.created_at))}
                    </p>
                  </div>

                  {notice.is_pinned && (
                    <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                      Pinned
                    </span>
                  )}
                </div>

                <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {notice.content}
                </div>

                {attachments && attachments.length > 0 && (
                  <div className="mt-6 border-t border-border pt-6">
                    <h2 className="text-sm font-semibold text-foreground">
                      Attachment
                    </h2>

                    <div className="mt-3 space-y-2">
                      {attachments.map((attachment) => {
                        const fileName =
                          attachment.file_path.split("/").pop()?.replace(
                            /^[0-9a-f-]+-/i,
                            "",
                          ) || "Attachment";

                        const fileSize =
                          attachment.file_size_bytes < 1024 * 1024
                            ? `${Math.max(
                                1,
                                Math.round(attachment.file_size_bytes / 1024),
                              )} KB`
                            : `${(
                                attachment.file_size_bytes /
                                (1024 * 1024)
                              ).toFixed(1)} MB`;

                        const isImage = attachment.file_type.startsWith("image/");

                        if (isImage) {
                          return (
                            <div
                              key={attachment.id}
                              className="space-y-3"
                            >
                              <NoticeImagePreview
                                attachmentId={attachment.id}
                                fileName={fileName}
                              />

                              <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {fileName}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {attachment.file_type} &middot; {fileSize}
                                  </p>
                                </div>

                                <NoticeAttachmentActions
                                  attachmentId={attachment.id}
                                  showOpen={false}
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={attachment.id}
                            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {fileName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {attachment.file_type} &middot; {fileSize}
                              </p>
                            </div>

                            <NoticeAttachmentActions
                              attachmentId={attachment.id}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}