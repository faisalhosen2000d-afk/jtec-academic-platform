import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type AdminAccount = {
  id: string;
  full_name: string;
  email: string;
};

type Department = {
  id: string;
  name: string;
};

type StaffScope = {
  id: string;
  profile_id: string;
  department_id: string | null;
  can_verify_students: boolean;
  can_verify_results: boolean;
  can_manage_upload_permission: boolean;
  can_approve_materials: boolean;
  can_publish_notices: boolean;
  can_delete_notices: boolean;
};

async function saveStaffScope(formData: FormData) {
  "use server";

  const adminId = String(formData.get("admin_id") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const scopeId = String(formData.get("scope_id") ?? "").trim();

  const canVerifyStudents = formData.get("can_verify_students") === "on";
  const canVerifyResults = formData.get("can_verify_results") === "on";
  const canManageUploadPermission =
    formData.get("can_manage_upload_permission") === "on";
  const canApproveMaterials = formData.get("can_approve_materials") === "on";
  const canPublishNotices = formData.get("can_publish_notices") === "on";
  const canDeleteNotices = formData.get("can_delete_notices") === "on";

  if (!adminId) {
    redirect(
      "/super-admin/users/staff/permissions?error=Admin%20is%20required",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!actorProfile || actorProfile.role !== "super_admin") {
    redirect("/");
  }

  const { data: targetAdmin } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", adminId)
    .maybeSingle();

  if (!targetAdmin || targetAdmin.role !== "admin") {
    redirect("/super-admin/users/staff/permissions?error=Invalid%20Admin");
  }

  const normalizedDepartmentId =
    departmentId === "all" || departmentId === "" ? null : departmentId;

  if (scopeId) {
    const { error } = await supabase
      .from("staff_scopes")
      .update({
        department_id: normalizedDepartmentId,
        can_verify_students: canVerifyStudents,
        can_verify_results: canVerifyResults,
        can_manage_upload_permission: canManageUploadPermission,
        can_approve_materials: canApproveMaterials,
        can_publish_notices: canPublishNotices,
        can_delete_notices: canDeleteNotices,
      })
      .eq("id", scopeId);

    if (error) {
      redirect(
        `/super-admin/users/staff/permissions?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }
  } else {
    let existingQuery = supabase
      .from("staff_scopes")
      .select("id")
      .eq("profile_id", adminId);

    if (normalizedDepartmentId === null) {
      existingQuery = existingQuery.is("department_id", null);
    } else {
      existingQuery = existingQuery.eq("department_id", normalizedDepartmentId);
    }

    const { data: existingScope, error: existingScopeError } =
      await existingQuery.maybeSingle();

    if (existingScopeError) {
      redirect(
        `/super-admin/users/staff/permissions?error=${encodeURIComponent(
          existingScopeError.message,
        )}`,
      );
    }

    if (existingScope) {
      const { error } = await supabase
        .from("staff_scopes")
        .update({
          can_verify_students: canVerifyStudents,
          can_verify_results: canVerifyResults,
          can_manage_upload_permission: canManageUploadPermission,
          can_approve_materials: canApproveMaterials,
          can_publish_notices: canPublishNotices,
          can_delete_notices: canDeleteNotices,
        })
        .eq("id", existingScope.id);

      if (error) {
        redirect(
          `/super-admin/users/staff/permissions?error=${encodeURIComponent(
            error.message,
          )}`,
        );
      }
    } else {
      const { error } = await supabase.from("staff_scopes").insert({
        profile_id: adminId,
        department_id: normalizedDepartmentId,
        can_verify_students: canVerifyStudents,
        can_verify_results: canVerifyResults,
        can_manage_upload_permission: canManageUploadPermission,
        can_approve_materials: canApproveMaterials,
        can_publish_notices: canPublishNotices,
        can_delete_notices: canDeleteNotices,
        granted_by: user.id,
      });

      if (error) {
        redirect(
          `/super-admin/users/staff/permissions?error=${encodeURIComponent(
            error.message,
          )}`,
        );
      }
    }
  }

  revalidatePath("/super-admin/users/staff/permissions");
  redirect("/super-admin/users/staff/permissions?saved=1");
}

async function deleteStaffScope(formData: FormData) {
  "use server";

  const scopeId = String(formData.get("scope_id") ?? "").trim();

  if (!scopeId) {
    redirect(
      "/super-admin/users/staff/permissions?error=Scope%20ID%20is%20required",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!actorProfile || actorProfile.role !== "super_admin") {
    redirect("/");
  }

  const { error } = await supabase
    .from("staff_scopes")
    .delete()
    .eq("id", scopeId);

  if (error) {
    redirect(
      `/super-admin/users/staff/permissions?error=${encodeURIComponent(
        error.message,
      )}`,
    );
  }

  revalidatePath("/super-admin/users/staff/permissions");
  redirect("/super-admin/users/staff/permissions?saved=1");
}

const CAPABILITIES = [
  {
    name: "can_verify_students",
    label: "Student Verification",
    description: "Allow verification of students in this scope.",
  },
  {
    name: "can_verify_results",
    label: "Student Result Upload",
    description: "Allow uploading and publishing student results in this scope.",
  },
  {
    name: "can_manage_upload_permission",
    label: "Upload Permission Management",
    description: "Allow changing student material-upload permission.",
  },
  {
    name: "can_approve_materials",
    label: "Material Approval",
    description: "Allow approval of student-submitted materials.",
  },
  {
    name: "can_publish_notices",
    label: "Publish Notices",
    description: "Allow publishing notices within this department scope.",
  },
  {
    name: "can_delete_notices",
    label: "Delete Notices",
    description:
      "Allow permanently deleting notices within this department scope.",
  },
] as const;

export default async function StaffPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
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

  if (!currentProfile || currentProfile.role !== "super_admin") {
    redirect("/");
  }

  const [{ data: admins }, { data: departments }, { data: scopes }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "admin")
        .order("full_name", { ascending: true }),

      supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true }),

      supabase
        .from("staff_scopes")
        .select(
          "id, profile_id, department_id, can_verify_students, can_verify_results, can_manage_upload_permission, can_approve_materials, can_publish_notices, can_delete_notices",
        )
        .order("created_at", { ascending: false }),
    ]);

  const adminAccounts = (admins ?? []) as AdminAccount[];
  const departmentList = (departments ?? []) as Department[];
  const staffScopes = (scopes ?? []) as StaffScope[];

  const adminMap = new Map(adminAccounts.map((admin) => [admin.id, admin]));
  const departmentMap = new Map(
    departmentList.map((department) => [department.id, department]),
  );

  const globalScopesCount = staffScopes.filter(
    (s) => s.department_id === null,
  ).length;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-300 shadow-[0_0_18px_rgba(139,92,246,0.22)]">
                <KeyRound className="h-3 w-3" />
                Staff Permissions
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Staff Permissions
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage department scope and capability permissions for Admin
              staff.
            </p>
          </div>

          <Link
            href="/super-admin/users/staff"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:text-violet-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Staff Management</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin Accounts
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-violet-300">
              {adminAccounts.length}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Configured Scopes
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {staffScopes.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              All-Department Scopes
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {globalScopesCount}
            </p>
          </div>
        </section>

        {params.saved === "1" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-5 py-3.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Staff permission settings saved successfully.</span>
          </div>
        ) : null}

        {params.error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-5 py-3.5 text-xs font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{params.error}</span>
          </div>
        ) : null}

        <section className="rounded-2xl border border-violet-500/30 bg-[#0A1020] p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="font-serif text-lg font-bold text-white">
              Add Permission Scope
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Assign an Admin to a department and choose the capabilities
              available within that scope.
            </p>
          </div>

          {adminAccounts.length === 0 ? (
            <p className="text-xs text-slate-400">
              No Admin accounts are available.
            </p>
          ) : (
            <form action={saveStaffScope} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin_id"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Admin Account
                  </label>
                  <select
                    id="admin_id"
                    name="admin_id"
                    required
                    defaultValue=""
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white [color-scheme:dark] transition-all focus:border-violet-400/80 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="" disabled>
                      Select Admin
                    </option>
                    {adminAccounts.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="department_id"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Department Scope
                  </label>
                  <select
                    id="department_id"
                    name="department_id"
                    defaultValue="all"
                    className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white [color-scheme:dark] transition-all focus:border-violet-400/80 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    <option value="all">All Departments</option>
                    {departmentList.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {CAPABILITIES.map((cap) => (
                  <label
                    key={cap.name}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-[#060A12] p-4 transition-all hover:border-slate-700 has-[:checked]:border-violet-500/60 has-[:checked]:bg-violet-500/10"
                  >
                    <input
                      type="checkbox"
                      name={cap.name}
                      className="mt-0.5 h-4 w-4 rounded accent-violet-500"
                    />
                    <span>
                      <span className="block text-xs font-bold text-white">
                        {cap.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {cap.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-5 text-xs font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-150 hover:from-violet-400 hover:to-purple-400 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Save Permission Scope</span>
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="font-serif text-lg font-bold text-white">
              Current Permission Scopes
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Existing Admin permission scopes currently configured in the
              platform.
            </p>
          </div>

          {staffScopes.length === 0 ? (
            <p className="text-xs text-slate-400">
              No permission scopes configured yet.
            </p>
          ) : (
            <div className="space-y-5">
              {staffScopes.map((scope) => {
                const admin = adminMap.get(scope.profile_id);
                if (!admin) return null;

                const deptName = scope.department_id
                  ? (departmentMap.get(scope.department_id)?.name ??
                    "Unknown Department")
                  : "All Departments";

                return (
                  <div
                    key={scope.id}
                    className="rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {admin.full_name}
                          </h3>
                          <span className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-300">
                            {deptName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {admin.email}
                        </p>
                      </div>

                      <form action={deleteStaffScope}>
                        <input type="hidden" name="scope_id" value={scope.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/25 active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove Scope</span>
                        </button>
                      </form>
                    </div>

                    <form action={saveStaffScope} className="space-y-4">
                      <input type="hidden" name="scope_id" value={scope.id} />
                      <input
                        type="hidden"
                        name="admin_id"
                        value={scope.profile_id}
                      />

                      <div className="max-w-sm space-y-1.5">
                        <label
                          htmlFor={`department-${scope.id}`}
                          className="block text-xs font-semibold text-slate-300"
                        >
                          Department Scope
                        </label>
                        <select
                          id={`department-${scope.id}`}
                          name="department_id"
                          defaultValue={scope.department_id ?? "all"}
                          className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#0A1020] px-3 text-xs text-white [color-scheme:dark] transition-all focus:border-violet-400/80 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="all">All Departments</option>
                          {departmentList.map((department) => (
                            <option key={department.id} value={department.id}>
                              {department.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {CAPABILITIES.map((cap) => (
                          <label
                            key={cap.name}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-[#0A1020] px-3.5 py-2.5 text-xs font-medium text-slate-300 transition-all hover:border-slate-700 has-[:checked]:border-violet-500/60 has-[:checked]:bg-violet-500/10 has-[:checked]:text-white"
                          >
                            <input
                              type="checkbox"
                              name={cap.name}
                              defaultChecked={Boolean(scope[cap.name])}
                              className="h-4 w-4 rounded accent-violet-500"
                            />
                            <span>{cap.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-slate-400">
                          Current scope:{" "}
                          <span className="font-semibold text-slate-200">
                            {deptName}
                          </span>
                        </p>

                        <button
                          type="submit"
                          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 text-xs font-bold text-white shadow-[0_0_16px_rgba(139,92,246,0.25)] transition-all hover:from-violet-400 hover:to-purple-400 active:scale-95"
                        >
                          <Save className="h-3.5 w-3.5" />
                          <span>Update Permissions</span>
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Permission Security:
            </span>{" "}
            Only Super Admin can create, update, or remove Admin permission
            scopes. Admin capabilities remain subject to server-side database
            permission checks.
          </p>
        </section>
      </main>
    </div>
  );
}