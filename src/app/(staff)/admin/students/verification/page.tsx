import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { StudentVerificationClient, type PendingStudentItem } from "./StudentVerificationClient";

export const dynamic = "force-dynamic";

type RegCodeJoinedRow = {
  student_id: string | null;
  departments?: { name: string } | null;
  batches?: { name: string } | null;
  levels?: { name: string } | null;
  terms?: { name: string } | null;
};

type RawStudentRow = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  is_verified: boolean;
  verification_status?: string;
  id_card_image_path?: string | null;
  created_at: string;
};

export default async function AdminStudentVerificationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || !["admin", "super_admin", "moderator"].includes(currentProfile.role)) {
    redirect("/staff-login");
  }

  // 1. Fetch pending students
  const serviceRole = createServiceRoleClient();
  const { data: studentsData } = await serviceRole
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq("is_verified", false)
    .order("created_at", { ascending: true });

  const rawStudents = ((studentsData ?? []) as unknown) as RawStudentRow[];

  // 2. Fetch matched academic records from registration_codes
  const studentRolls = rawStudents.map((s) => s.student_id).filter(Boolean) as string[];

  const codeRecordsMap = new Map<string, RegCodeJoinedRow>();
  if (studentRolls.length > 0) {
    const { data: regCodes } = await serviceRole
      .from("registration_codes")
      .select(`
        student_id,
        department_id,
        batch_id,
        level_id,
        term_id,
        departments:department_id(name),
        batches:batch_id(name),
        levels:level_id(name),
        terms:term_id(name)
      `)
      .in("student_id", studentRolls);

    if (regCodes) {
      regCodes.forEach((rc) => {
        if (rc.student_id && !codeRecordsMap.has(rc.student_id)) {
          codeRecordsMap.set(rc.student_id, rc);
        }
      });
    }
  }

  // 3. Generate signed URLs for private ID card images
  
  const enhancedStudents: PendingStudentItem[] = await Promise.all(
    rawStudents.map(async (st) => {
      let signedUrl: string | null = null;
      if (st.id_card_image_path) {
        try {
          const { data: urlData } = await serviceRole.storage
            .from("student-id-verifications")
            .createSignedUrl(st.id_card_image_path, 600);
          signedUrl = urlData?.signedUrl ?? null;
        } catch {
          signedUrl = null;
        }
      }

      const rc = st.student_id ? codeRecordsMap.get(st.student_id) : null;

      return {
        id: st.id,
        full_name: st.full_name,
        student_id: st.student_id,
        email: st.email,
        created_at: st.created_at,
        id_card_image_path: st.id_card_image_path ?? null,
        id_card_signed_url: signedUrl,
        matched_record: rc
          ? {
              department_name: rc.departments?.name ?? null,
              batch_name: rc.batches?.name ?? null,
              level_name: rc.levels?.name ?? null,
              term_name: rc.terms?.name ?? null,
            }
          : null,
      };
    })
  );

  return (
    <main className="min-h-screen bg-[#050811] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/10 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-400">
                Institutional Staff Portal
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-medium">Administration Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Student ID Card Verification
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl">
              Inspect student identity cards uploaded during self-registration, verify against institutional student database, and approve to unlock academic access.
            </p>
          </div>

          <Link href="/admin">
            <Button className="rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400 hover:text-white">
              Back to Admin Console
            </Button>
          </Link>
        </div>

        <StudentVerificationClient students={enhancedStudents} />
      </div>
    </main>
  );
}
