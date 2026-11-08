import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";
import { CgpaCalculatorClient } from "@/components/calculator/CgpaCalculatorClient";

export const dynamic = "force-dynamic";

interface PublishedResultRow {
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
}

export default async function CgpaCalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, student_id, department_id, batch_id, departments:department_id(name, code)")
    .eq("id", user.id)
    .single();

  const deptObj = profile?.departments as unknown as { name?: string; code?: string } | null;
  const deptCode = (deptObj?.code || "").toLowerCase();

  let defaultDeptId = "ae";
  if (deptCode.includes("wpe") || deptCode.includes("wet")) defaultDeptId = "wpe";
  else if (deptCode.includes("fe") || deptCode.includes("fabric")) defaultDeptId = "fe";
  else if (deptCode.includes("ye") || deptCode.includes("yarn")) defaultDeptId = "ye";
  else if (deptCode.includes("ae") || deptCode.includes("apparel")) defaultDeptId = "ae";

  const rawClient = createRawSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let publishedResults: Array<{ termKey: string; gpa: number; cgpa: number | null }> = [];
  if (profile?.student_id) {
    const { data: results } = await rawClient
      .from("term_results")
      .select("level_term_key, gpa, cgpa")
      .or(`student_id.eq.${user.id},student_id_code.eq.${profile.student_id}`)
      .order("level_term_key", { ascending: true });

    if (results) {
      publishedResults = (results as PublishedResultRow[]).map((r) => ({
        termKey: r.level_term_key,
        gpa: Number(r.gpa) || 0,
        cgpa: r.cgpa !== null ? Number(r.cgpa) : null,
      }));
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <StudentHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          <CgpaCalculatorClient
            studentName={profile?.full_name || "Student"}
            studentRoll={profile?.student_id || ""}
            defaultDepartmentId={defaultDeptId}
            publishedResults={publishedResults}
          />
        </main>
      </div>
    </div>
  );
}