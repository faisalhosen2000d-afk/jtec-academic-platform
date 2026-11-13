import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffProfileClient } from "@/components/staff/StaffProfileClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/staff-login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department_id, designation, phone, office_room, specialization, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile = rawProfile as {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    department_id: string | null;
    designation: string | null;
    phone: string | null;
    office_room: string | null;
    specialization: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    redirect("/staff-login");
  }

  let deptName: string | null = null;
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", profile.department_id)
      .maybeSingle();
    deptName = dept?.name ?? null;
  }

  return (
    <StaffProfileClient
      profile={{
        id: profile.id,
        full_name: profile.full_name || "Administrator",
        email: profile.email || user.email || "",
        role: profile.role,
        department_name: deptName,
        designation: profile.designation,
        phone: profile.phone,
        office_room: profile.office_room,
        specialization: profile.specialization,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      }}
      backHref="/super-admin"
      backLabel="Back to Super Admin"
    />
  );
}