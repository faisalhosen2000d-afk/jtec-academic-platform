"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import BulkDeleteNoticeForm from "./BulkDeleteNoticeForm";

export default async function BulkDeleteNoticesPage() {
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

  let canDelete = profile.role === "super_admin";

  if (profile.role === "admin") {
    const { data: deleteScopes } = await supabase
      .from("staff_scopes")
      .select("can_delete_notices")
      .eq("profile_id", user.id)
      .eq("can_delete_notices", true);

    canDelete = Boolean(deleteScopes && deleteScopes.length > 0);
  }

  if (!canDelete) {
    redirect("/admin/notices");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Notice Management
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Bulk Delete Notices
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Permanently delete multiple notices by selecting a date range.
            </p>
          </div>

          <Link href="/admin/notices">
            <Button variant="outline">Back to Notices</Button>
          </Link>
        </div>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Select Date Range</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose the period whose notices you want to permanently delete.
          </p>

          <div className="mt-6">
            <BulkDeleteNoticeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
