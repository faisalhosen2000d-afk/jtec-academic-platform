import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  MaterialsLibraryClient,
  type LibraryMaterialItem,
} from "./MaterialsLibraryClient";

export const dynamic = "force-dynamic";

type GenericRow = Record<string, unknown>;

function formatFileType(raw: string | null): string {
  if (!raw) return "FILE";
  const lower = raw.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("presentation") || lower.includes("powerpoint") || lower.includes("ppt")) return "PPTX";
  if (lower.includes("wordprocessing") || lower.includes("msword") || lower.includes("doc")) return "DOCX";
  if (lower.includes("spreadsheet") || lower.includes("excel") || lower.includes("xls")) return "XLSX";
  if (lower.includes("image")) return "IMG";
  return raw.split("/").pop()?.toUpperCase().slice(0, 8) || "FILE";
}

export default async function AdminMaterialsLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/staff-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    redirect("/staff-login");
  }

  const serviceRole = createServiceRoleClient();
  const [
    matRes,
    subjRes,
    deptRes,
    lvlRes,
    termRes,
  ] = await Promise.all([
    serviceRole
      .from("materials")
      .select("id, title, description, file_type, created_at, subject_id, department_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("subjects").select("id, subject_code, subject_name, department_id, level_id, term_id").order("subject_code"),
    supabase.from("departments").select("id, name, code").order("code"),
    supabase.from("levels").select("id, name, sort_order").order("sort_order"),
    supabase.from("terms").select("id, level_id, name, sort_order").order("sort_order"),
  ]);

  const rawMaterials = (matRes.data || []) as GenericRow[];
  const rawSubjects = ((subjRes.data && subjRes.data.length > 0 ? subjRes.data : (await serviceRole.from("subjects").select("id, subject_code, subject_name, department_id, level_id, term_id")).data) || []) as GenericRow[];
  const rawDepts = ((deptRes.data && deptRes.data.length > 0 ? deptRes.data : (await serviceRole.from("departments").select("id, name, code")).data) || []) as GenericRow[];
  const rawLevels = ((lvlRes.data && lvlRes.data.length > 0 ? lvlRes.data : (await serviceRole.from("levels").select("id, name, sort_order")).data) || []) as GenericRow[];
  const rawTerms = ((termRes.data && termRes.data.length > 0 ? termRes.data : (await serviceRole.from("terms").select("id, level_id, name, sort_order")).data) || []) as GenericRow[];

  const deptMap = new Map<string, { id: string; name: string; code: string }>();
  rawDepts.forEach((d) => {
    const id = String(d.id || "");
    const name = String(d.name || "Department");
    const code = String(d.code || name);
    if (id) deptMap.set(id, { id, name, code });
  });

  const levelMap = new Map<string, { id: string; name: string; sort: number }>();
  rawLevels.forEach((l) => {
    const id = String(l.id || "");
    const name = String(l.name || "Level");
    const sort = Number(l.sort_order ?? 0);
    if (id) levelMap.set(id, { id, name, sort });
  });

  const termMap = new Map<string, { id: string; name: string; sort: number }>();
  rawTerms.forEach((t) => {
    const id = String(t.id || "");
    const name = String(t.name || "Term");
    const sort = Number(t.sort_order ?? 0);
    if (id) termMap.set(id, { id, name, sort });
  });

  const subjMap = new Map<string, GenericRow>();
  rawSubjects.forEach((s) => {
    const id = String(s.id || "");
    if (id) subjMap.set(id, s);
  });

  const items: LibraryMaterialItem[] = rawMaterials.map((m) => {
    const subjId = m.subject_id ? String(m.subject_id) : null;
    const subj = subjId ? subjMap.get(subjId) : undefined;

    const deptId = m.department_id
      ? String(m.department_id)
      : subj?.department_id
        ? String(subj.department_id)
        : null;
    const dept = deptId ? deptMap.get(deptId) : undefined;

    const lvlId = subj?.level_id ? String(subj.level_id) : null;
    const lvl = lvlId ? levelMap.get(lvlId) : undefined;

    const trmId = subj?.term_id ? String(subj.term_id) : null;
    const trm = trmId ? termMap.get(trmId) : undefined;

    return {
      id: String(m.id || ""),
      title: String(m.title || "Untitled Material"),
      description: m.description ? String(m.description) : null,
      file_type: formatFileType(m.file_type ? String(m.file_type) : null),
      created_at: String(m.created_at || ""),
      subject_id: subjId,
      subject_code: String(subj?.subject_code || "SUBJ"),
      subject_name: String(subj?.subject_name || "General Subject"),
      department_id: deptId,
      department_code: dept?.code || "ALL",
      department_name: dept?.name || "All Departments",
      level_id: lvlId,
      level_name: lvl?.name || "",
      term_id: trmId,
      term_name: trm?.name || "",
    };
  });

  const departments = Array.from(deptMap.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` }));

  const levels = Array.from(levelMap.values())
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((l) => ({ id: l.id, label: l.name }));

  const terms = Array.from(termMap.values())
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
    .map((t) => ({ id: t.id, label: t.name }));

  return (
    <MaterialsLibraryClient
      materials={items}
      departments={departments}
      levels={levels}
      terms={terms}
    />
  );
}