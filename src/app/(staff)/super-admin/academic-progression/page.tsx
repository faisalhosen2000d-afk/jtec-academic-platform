import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AcademicProgressionPanel from "./AcademicProgressionPanel";

export const dynamic = "force-dynamic";

export default async function AcademicProgressionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/staff-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") redirect("/");

  const [batchesResult, levelsResult, termsResult, studentsResult] =
    await Promise.all([
      supabase.from("batches").select("id,name").order("name"),
      supabase.from("levels").select("id,name,sort_order").order("sort_order"),
      supabase.from("terms").select("id,level_id,name,sort_order").order("sort_order"),
      supabase.from("profiles")
        .select("id,full_name,student_id,email,batch_id,current_level_id,current_term_id")
        .eq("role", "student")
        .order("full_name"),
    ]);

  const queryResults = [
    { name: "batches", result: batchesResult },
    { name: "levels", result: levelsResult },
    { name: "terms", result: termsResult },
    { name: "students", result: studentsResult },
  ];

  for (const item of queryResults) {
    if (item.result.error) {
      console.error(
        `[Academic Progression] ${item.name} query failed:`,
        item.result.error.message
      );
    } else {
      console.info(
        `[Academic Progression] ${item.name} rows:`,
        item.result.data?.length ?? 0
      );
    }
  }

  const errors = queryResults
    .map((item) => item.result.error)
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              <Link href="/super-admin" className="hover:underline">Super Admin</Link>
              {" / Academic Progression"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Academic Progression</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review student academic assignments before moving a batch forward.
            </p>
          </div>
          <Link
            href="/super-admin/academic-structure"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Academic Structure
          </Link>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            Some academic data could not be loaded. Check the database schema and
            permissions before using the preview.
          </div>
        )}

        <AcademicProgressionPanel
          batches={batchesResult.data ?? []}
          levels={levelsResult.data ?? []}
          terms={termsResult.data ?? []}
          students={studentsResult.data ?? []}
        />
      </div>
    </main>
  );
}