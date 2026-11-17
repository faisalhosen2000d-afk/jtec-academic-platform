import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { CgpaCalculatorClient } from "@/components/calculator/CgpaCalculatorClient";
import { AcademicAiAdvisor } from "@/components/calculator/AcademicAiAdvisor";

export const dynamic = "force-dynamic";

interface PublishedResultRow {
  level_term_key: string;
  gpa: number;
  cgpa: number | null;
  status?: string | null;
  remarks?: string | null;
}

function getRetakeCodes(remarks?: string | null): string[] {
  if (!remarks) return [];
  const c = remarks.replace(/^Retakes:\s*/i, "").trim();
  if (!c || c === "0" || c.toLowerCase() === "none" || c.startsWith("Year Dropped")) return [];
  return c
    .split(/[,;|]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
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
  const retakeSet = new Set<string>();

  if (profile?.student_id) {
    const { data: results } = await rawClient
      .from("term_results")
      .select("level_term_key, gpa, cgpa, status, remarks")
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
          getRetakeCodes(r.remarks).forEach((code) => retakeSet.add(`${code} (${r.level_term_key})`));
        }
      });
      publishedResults = Array.from(termMap.values());
    }
  }

  const pendingRetakes = Array.from(retakeSet);

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
              <AcademicAiAdvisor
                studentName={profile?.full_name || "Student"}
                department={deptObj?.code || undefined}
                storageKey={`calc_${user.id}`}
                terms={publishedResults}
                retakes={pendingRetakes}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}