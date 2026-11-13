import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { CgpaCalculatorClient } from "@/components/calculator/CgpaCalculatorClient";

export const dynamic = "force-dynamic";

interface PublishedResultRow {
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  status?: string | null;
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

  // Pre-load only ACTUALLY COMPLETED term results (exclude air_dropped 0.00 rows so 1-2 remains Target/Projected until passed with 9th batch)
  let publishedResults: Array<{ termKey: string; gpa: number; cgpa: number | null }> = [];
  if (profile?.student_id) {
    const { data: results } = await rawClient
      .from("term_results")
      .select("level_term_key, gpa, cgpa, status")
      .or(`student_id.eq.${user.id},student_id_code.eq.${profile.student_id.trim()}`)
      .neq("status", "air_dropped")
      .order("level_term_key", { ascending: true });

    if (results) {
      const termMap = new Map<string, { termKey: string; gpa: number; cgpa: number | null }>();
      (results as PublishedResultRow[]).forEach((r) => {
        if (r.status !== "air_dropped" && Number(r.gpa) > 0) {
          termMap.set(r.level_term_key, {
            termKey: r.level_term_key,
            gpa: Number(r.gpa) || 0,
            cgpa: r.cgpa !== null ? Number(r.cgpa) : null,
          });
        }
      });
      publishedResults = Array.from(termMap.values());
    }
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
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
      `}</style>
      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              <CgpaCalculatorClient
                studentName={profile?.full_name || "Student"}
                studentRoll={profile?.student_id || ""}
                defaultDepartmentId={defaultDeptId}
                publishedResults={publishedResults}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}