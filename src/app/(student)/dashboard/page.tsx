import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import NoticeList from "@/components/dashboard/NoticeList";

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      student_id,
      full_name,
      email,
      department_id,
      batch_id,
      current_level_id,
      current_term_id
    `)
    .eq("id", user.id)
    .single();

  console.log("[dashboard][profile]", profile);
  console.log("[dashboard][profileError]", profileError);

  const { data: department, error: departmentError } =
    profile?.department_id
      ? await supabase
          .from("departments")
          .select("name")
          .eq("id", profile.department_id)
          .single()
      : { data: null, error: null };

  console.log("[dashboard][department]", department);
  console.log("[dashboard][departmentError]", departmentError);

  const { data: batch } = profile?.batch_id
    ? await supabase
        .from("batches")
        .select("name")
        .eq("id", profile.batch_id)
        .single()
    : { data: null };

  const { data: level } = profile?.current_level_id
    ? await supabase
        .from("levels")
        .select("name")
        .eq("id", profile.current_level_id)
        .single()
    : { data: null };

  const { data: term } = profile?.current_term_id
    ? await supabase
        .from("terms")
        .select("name")
        .eq("id", profile.current_term_id)
        .single()
    : { data: null };

  const { data: notices, error: noticesError } = await supabase
    .from("notices")
    .select(
      "id, title, category_id, content, target_scope, target_department_id, target_batch_id, target_level_id, target_term_id, is_pinned, created_at",
    )
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  console.log("[dashboard][notices]", notices);
  console.log("[dashboard][noticesError]", noticesError);

  const { data: noticeCategories } = await supabase
    .from("notice_categories")
    .select("id, name")
    .order("name", { ascending: true });

  const studentName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Student";

  const studentId =
    profile?.student_id ||
    user.user_metadata?.student_id ||
    "Student";

  const studentEmail = profile?.email || user.email || "-";

  const departmentName = department?.name || "Not assigned";
  const batchName = batch?.name || "Not assigned";
  const levelName = level?.name || "Not assigned";
  const termName = term?.name || "Not assigned";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        {/* Student Sidebar */}
        <StudentSidebar />

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <StudentHeader />

          {/* Dashboard Content */}
          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              {/* Welcome */}
              <section>
                <p className="text-sm text-muted-foreground">
                  Welcome back
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Hello, {studentName} &#128075;
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Here&apos;s an overview of your academic activity.
                </p>
              </section>

              {/* Academic Information */}
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Academic Information
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Your current academic information.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Department
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {departmentName}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Batch
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {batchName}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Level
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {levelName}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">
                      Term
                    </p>

                    <p className="mt-1 text-sm font-medium text-foreground">
                      {termName}
                    </p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Materials
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    &mdash;
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Available for you
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Bookmarks
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    &mdash;
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Saved materials
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Results
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    &mdash;
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Academic results
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Ranking
                  </p>

                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    &mdash;
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Current position
                  </p>
                </div>
              </section>

              {/* Notices */}
              <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Notices
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Recent academic notices relevant to you.
                    </p>
                  </div>

                  <Link
                    href="/notifications"
                    className="w-fit rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    View Notifications
                  </Link>
                </div>

                <div className="mt-5">
                  {noticesError ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                      Notices could not be loaded.
                    </div>
                  ) : notices && notices.length > 0 ? (
                    <NoticeList categories={noticeCategories ?? []}>
                      <div className="divide-y divide-border">
                        {notices.map((notice) => (
                          <div
                            key={notice.id}
                            data-notice-search={`${notice.title} ${notice.content}`}
                            data-notice-category={notice.category_id ?? ""}
                            className="p-4 transition-colors hover:bg-muted/40"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-foreground">
                                    {notice.title}
                                  </h4>

                                  {notice.is_pinned && (
                                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">
                                      Pinned
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {new Intl.DateTimeFormat("en-US", {
                                    timeZone: "Asia/Dhaka",
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(notice.created_at))}
                                </p>
                              </div>

                              <Link
                                href={`/notices/${notice.id}`}
                                className="w-fit shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                              >
                                Open
                              </Link>
                            </div>

                            <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                              {notice.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </NoticeList>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="font-medium text-foreground">
                        No notices yet
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        New academic notices relevant to you will appear here.
                      </p>
                    </div>
                  )}
                </div>              </section>

              {/* Quick Access */}
              <section className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Quick Access
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Quickly access your main academic sections.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                      href="/materials"
                      className="rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                    >
                      <p className="font-medium text-foreground">
                        Study Materials
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Browse available academic materials.
                      </p>
                    </Link>

                    <Link
                      href="/folders"
                      className="rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                    >
                      <p className="font-medium text-foreground">
                        My Folders
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Organize your saved materials.
                      </p>
                    </Link>

                    <Link
                      href="/bookmarks"
                      className="rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                    >
                      <p className="font-medium text-foreground">
                        Bookmarks
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Open your bookmarked resources.
                      </p>
                    </Link>

                    <Link
                      href="/results"
                      className="rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                    >
                      <p className="font-medium text-foreground">
                        Results
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        View your academic results.
                      </p>
                    </Link>
                  </div>
                </div>

                {/* Account */}
                <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                  <h3 className="font-semibold text-foreground">
                    Account
                  </h3>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Student Name
                      </p>

                      <p className="mt-1 text-sm font-medium text-foreground">
                        {studentName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Student ID
                      </p>

                      <p className="mt-1 text-sm font-medium text-foreground">
                        {studentId}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Email
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-foreground">
                        {studentEmail}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      className="block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </section>

              {/* Status */}
              <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-green-500"
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Account session active
                    </p>

                    <p className="text-xs text-muted-foreground">
                      You are securely signed in to the JTEC Academic
                      Platform.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}