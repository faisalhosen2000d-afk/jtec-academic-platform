import Link from "next/link";
import { ArrowLeft, BellRing, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import NoticeCreateForm from "./NoticeCreateForm";
import NoticeList from "./NoticeList";
import { DeleteNoticeButton } from "@/components/admin/DeleteNoticeButton";
import { toggleNoticePinForm } from "@/server/actions/notices";

export default async function AdminNoticesPage() {

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/");
  }

  const [
    { data: departments },
    { data: categories },
    { data: batches },
    { data: levels },
    { data: terms },
    { data: notices },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true }),

    supabase
      .from("notice_categories")
      .select("id, name")
      .order("name", { ascending: true }),

    supabase
      .from("batches")
      .select("id, name")
      .order("name", { ascending: true }),

    supabase
      .from("levels")
      .select("id, name")
      .order("sort_order", { ascending: true }),

    supabase
      .from("terms")
      .select("id, name, level_id")
      .order("sort_order", { ascending: true }),

    supabase
      .from("notices")
      .select(
        `
          id,
          title,
          category_id,
          content,
          target_scope,
          target_department_id,
          target_batch_id,
          target_level_id,
          target_term_id,
          is_pinned,
          pinned_by,
          is_archived,
          created_at
        `,
      )

      .order("created_at", { ascending: false }),
  ]);

  const pinnedByIds = Array.from(
    new Set(
      (notices ?? [])
        .map((notice) => notice.pinned_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: pinnerProfiles } =
    pinnedByIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", pinnedByIds)
      : { data: [] };

  const pinnerNameById = new Map(
    (pinnerProfiles ?? []).map((pinner) => [
      pinner.id,
      pinner.full_name ?? "JTEC Administrator",
    ]),
  );
  let canPublish = profile.role === "super_admin";

  if (profile.role === "admin") {
    const { data: adminScopes } = await supabase
      .from("staff_scopes")
      .select("can_publish_notices")
      .eq("profile_id", user.id)
      .eq("can_publish_notices", true);

    canPublish = Boolean(adminScopes && adminScopes.length > 0);
  }

  let canDelete = profile.role === "super_admin";

  if (profile.role === "admin") {
    const { data: deleteScopes } = await supabase
      .from("staff_scopes")
      .select("can_delete_notices")
      .eq("profile_id", user.id)
      .eq("can_delete_notices", true);

    canDelete = Boolean(deleteScopes && deleteScopes.length > 0);
  }

  return (
    <main className="min-h-screen bg-[#060A12] text-slate-100">
      <header className="pt-6 pb-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.45)]">
                <BellRing className="h-3 w-3" />
                Campus Announcements
              </span>
              <span className="text-xs text-slate-400">Staff Administration</span>
            </div>
            <h1 className="mt-2.5 font-serif text-2xl font-bold text-white sm:text-3xl">
              Notices &amp; Circulars
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/notices/bulk-delete"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Bulk Delete</span>
            </Link>
            <Link
              href={profile.role === "super_admin" ? "/super-admin" : "/admin"}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{profile.role === "super_admin" ? "Back to Super Admin" : "Back to Admin Console"}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <section className="lg:col-span-5 rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(6,182,212,0.08)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Publish New Notice</h2>

            <p className="mt-1 text-sm text-slate-400">
              Publish notices to all students or to a specific department
              with optional batch, level, and term targeting.
            </p>
          </div>

          <NoticeCreateForm
            departments={departments ?? []}
            categories={categories ?? []}
            batches={batches ?? []}
            levels={levels ?? []}
            terms={terms ?? []}
            canPublish={canPublish}
          />
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-cyan-950/25 via-[#0A1020] to-[#0A1020] shadow-xl">
          <div className="flex flex-col gap-4 border-b border-slate-800/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Published Notices</h2>
              <p className="mt-1 text-sm text-slate-400">
                Published and archived notices will appear here.
              </p>

              <NoticeList canDelete={canDelete} categories={categories ?? []}>
          {(notices ?? []).map((notice) => {
            const categoryName =
              (categories ?? []).find(
                (category) => category.id === notice.category_id,
              )?.name ?? "";

            return (
              <div
                key={notice.id}
                data-notice-search={`${notice.title} ${notice.content} ${categoryName}`}
                data-notice-category={notice.category_id ?? ""}
                className="divide-y divide-border"
              >
                <div className="p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{notice.title}</h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Dhaka",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(notice.created_at))}
                      </p>

                      <p className="mt-2 line-clamp-3 text-sm text-slate-400">
                        {notice.content}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                      <form action={toggleNoticePinForm}>
                        <input
                          type="hidden"
                          name="notice_id"
                          value={notice.id}
                        />

                        <Button type="submit" variant="outline">
                          {notice.is_pinned ? "Unpin" : "Pin"}
                        </Button>
                      </form>

                      {notice.is_pinned && (
                        <>
                          <span className="rounded-full border border-slate-800 px-2 py-1">
                            Pinned
                          </span>

                          <span className="rounded-full border border-slate-800 px-2 py-1">
                            Pinned by:{" "}
                            {pinnerNameById.get(notice.pinned_by ?? "") ??
                              "JTEC Administrator"}
                          </span>
                        </>
                      )}

                      {canDelete && (
                        <DeleteNoticeButton
                          noticeId={notice.id}
                          noticeTitle={notice.title}
                        />
                      )}

                      {notice.is_archived && (
                        <span className="rounded-full border border-slate-800 px-2 py-1">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </NoticeList>
            </div>


          </div>

        </section>      </div>
            </div>
      </main>
  );
}




































