import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  MaterialsLibraryClient,
  type LibraryMaterialItem,
} from "./MaterialsLibraryClient";

export const dynamic = "force-dynamic";

type RawMaterialRow = {
  id: string;
  title: string;
  description: string | null;
  file_type: string | null;
  created_at: string;
  subject_id: string | null;
  subject:
    | {
        subject_code: string;
        subject_name: string;
        department: { id: string; name: string; code: string } | null;
        level: { id: string; name: string } | null;
        term: { id: string; name: string } | null;
      }
    | null;
};

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
  const [{ data: rawMaterials }, { data: depts }, { data: levels }, { data: terms }] =
    await Promise.all([
      serviceRole
        .from("materials")
        .select(
          `
          id,
          title,
          description,
          file_type,
          created_at,
          subject_id,
          subject:subjects (
            subject_code,
            subject_name,
            department:departments ( id, name, code ),
            level:levels ( id, name ),
            term:terms ( id, name )
          )
        `
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1000),
      serviceRole.from("departments").select("id, name, code").order("code"),
      serviceRole.from("levels").select("id, name, sort_order").order("sort_order"),
      serviceRole.from("terms").select("id, name, sort_order").order("sort_order"),
    ]);

  const items: LibraryMaterialItem[] = ((rawMaterials || []) as unknown as RawMaterialRow[]).map(
    (m) => {
      const subj = Array.isArray(m.subject) ? m.subject[0] : m.subject;
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        file_type: m.file_type,
        created_at: m.created_at,
        subject_id: m.subject_id,
        subject_code: subj?.subject_code || "SUBJ",
        subject_name: subj?.subject_name || "General Subject",
        department_id: subj?.department?.id ?? null,
        department_code: subj?.department?.code || "ALL",
        department_name: subj?.department?.name || "All Departments",
        level_id: subj?.level?.id ?? null,
        level_name: subj?.level?.name || "",
        term_id: subj?.term?.id ?? null,
        term_name: subj?.term?.name || "",
      };
    }
  );

  return (
    <MaterialsLibraryClient
      materials={items}
      departments={(depts || []).map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` }))}
      levels={(levels || []).map((l) => ({ id: l.id, label: l.name }))}
      terms={(terms || []).map((t) => ({ id: t.id, label: t.name }))}
    />
  );
}