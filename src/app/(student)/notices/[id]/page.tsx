import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Megaphone, Paperclip, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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
              <section className="dash-stagger-1 flex items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0A1020] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/45 hover:text-cyan-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Dashboard
                </Link>
              </section>

              <article className="dash-stagger-2 rounded-2xl border border-amber-500/25 bg-[#0A1020] p-6 shadow-xl sm:p-8">
                <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
                      <Megaphone className="h-3 w-3" />
                      Official Notice
                    </span>

                    <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {notice.title}
                    </h1>

                    <p className="mt-2 text-xs sm:text-sm text-slate-400">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "Asia/Dhaka",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notice.created_at))}
                    </p>
                  </div>

                  {notice.is_pinned && (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                </div>

                <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {notice.content}
                </div>

                {attachments && attachments.length > 0 && (
                  <div className="mt-7 border-t border-slate-800/80 pt-6">
                    <h2 className="flex items-center gap-2 font-serif text-sm font-bold text-white">
                      <Paperclip className="h-4 w-4 text-cyan-400" />
                      Attachments ({attachments.length})
                    </h2>

                    <div className="mt-3 space-y-3">
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

                              <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0E172A] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {fileName}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-400">
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
                            className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0E172A] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {fileName}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
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