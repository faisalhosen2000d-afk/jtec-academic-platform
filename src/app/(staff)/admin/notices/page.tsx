import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import NoticeCreateForm from "./NoticeCreateForm";
import NoticeList from "./NoticeList";
import { DeleteNoticeButton } from "@/components/admin/DeleteNoticeButton";
import { deleteNoticeForm, toggleNoticePinForm } from "@/server/actions/notices";

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              JTEC Academic Platform
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Notice Management
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Create, manage, and publish academic notices for targeted
              students.
            </p>
          </div>

          <Link href={profile.role === "super_admin" ? "/super-admin" : "/admin"}>
            <Button variant="outline">
              {profile.role === "super_admin"
                ? "Back to Super Admin Dashboard"
                : "Back to Admin Dashboard"}
            </Button>
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Create Notice</h2>

            <p className="mt-1 text-sm text-muted-foreground">
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

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Existing Notices</h2>
              <p className="mt-1 text-sm text-muted-foreground">
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

                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: "Asia/Dhaka",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(notice.created_at))}
                      </p>

                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
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
                          <span className="rounded-full border border-border px-2 py-1">
                            Pinned
                          </span>

                          <span className="rounded-full border border-border px-2 py-1">
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
                        <span className="rounded-full border border-border px-2 py-1">
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
    </main>
  );
}




































