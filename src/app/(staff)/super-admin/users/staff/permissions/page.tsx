import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button } from "@/components/ui/button";
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

  const canVerifyStudents =
    formData.get("can_verify_students") === "on";
  const canVerifyResults =
    formData.get("can_verify_results") === "on";
  const canManageUploadPermission =
    formData.get("can_manage_upload_permission") === "on";
  const canApproveMaterials =
    formData.get("can_approve_materials") === "on";
  const canPublishNotices =
    formData.get("can_publish_notices") === "on";
  const canDeleteNotices =
    formData.get("can_delete_notices") === "on";

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
    redirect(
      "/super-admin/users/staff/permissions?error=Invalid%20Admin",
    );
  }

  const normalizedDepartmentId =
    departmentId === "all" || departmentId === ""
      ? null
      : departmentId;

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
      existingQuery = existingQuery.eq(
        "department_id",
        normalizedDepartmentId,
      );
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
          can_delete_notices: canDeleteNotices,
          can_approve_materials: canApproveMaterials,
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
      const { error } = await supabase
        .from("staff_scopes")
        .insert({
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

  const adminMap = new Map(
    adminAccounts.map((admin) => [admin.id, admin]),
  );

  const departmentMap = new Map(
    departmentList.map((department) => [department.id, department]),
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Staff Permissions
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage department scope and capability permissions for Admin
              staff.
            </p>
          </div>

          <Link href="/super-admin/users/staff">
            <Button variant="outline">Back to Staff Management</Button>
          </Link>
        </div>

        {params.saved === "1" && (
          <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">
              Staff permission settings saved successfully.
            </p>
          </div>
        )}

        {params.error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              {params.error}
            </p>
          </div>
        )}

        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              Add Permission Scope
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Assign an Admin to a department and choose the capabilities
              available within that scope.
            </p>
          </div>

          {adminAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Admin accounts are available.
            </p>
          ) : (
            <form action={saveStaffScope} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="admin_id"
                    className="text-sm font-medium"
                  >
                    Admin
                  </label>

                  <select
                    id="admin_id"
                    name="admin_id"
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select Admin</option>

                    {adminAccounts.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name} - {admin.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="department_id"
                    className="text-sm font-medium"
                  >
                    Department Scope
                  </label>

                  <select
                    id="department_id"
                    name="department_id"
                    defaultValue=""
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">
                      All Departments
                    </option>

                    {departmentList.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Capabilities
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="checkbox"
                      name="can_verify_students"
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Student Verification
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        Allow verification of students in this scope.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="checkbox"
                      name="can_verify_results"
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Result Verification
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        Allow result verification in this scope.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="checkbox"
                      name="can_manage_upload_permission"
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Upload Permission Management
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        Allow changing student material-upload permission.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="checkbox"
                      name="can_approve_materials"
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Material Approval
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        Allow approval of student-submitted materials.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                    <input
                      type="checkbox"
                      name="can_publish_notices"
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium">
                        Publish Notices
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        Allow publishing notices within this department scope.
                      </span>
                    </span>
                  </label>

                    <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                      <input
                        type="checkbox"
                        name="can_delete_notices"
                        className="mt-1"
                      />

                      <span>
                        <span className="block text-sm font-medium">
                          Delete Notices
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Allow permanently deleting notices within this department scope.
                        </span>
                      </span>
                    </label>
                </div>
              </div>

              <Button type="submit">Save Permission Scope</Button>
            </form>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">
              Current Permission Scopes
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Existing Admin permission scopes currently configured in the
              platform.
            </p>
          </div>

          {staffScopes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">No permission scopes configured.</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Add a scope above to grant capabilities to an Admin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staffScopes.map((scope) => {
                const admin = adminMap.get(scope.profile_id);

                if (!admin) {
                  return null;
                }

                const department = scope.department_id
                  ? departmentMap.get(scope.department_id)?.name ??
                    "Unknown Department"
                  : "All Departments";

                return (
                  <div key={scope.id} className="p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold">{admin.full_name}</h3>

                        <p className="text-sm text-muted-foreground">
                          {admin.email}
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          Scope: {department}
                        </p>
                      </div>

                      <form action={deleteStaffScope}>
                        <input
                          type="hidden"
                          name="scope_id"
                          value={scope.id}
                        />

                        <Button
                          type="submit"
                          variant="outline"
                        >
                          Remove Scope
                        </Button>
                      </form>
                    </div>

                    <form action={saveStaffScope} className="space-y-5">
                      <input
                        type="hidden"
                        name="admin_id"
                        value={scope.profile_id}
                      />

                      <input
                        type="hidden"
                        name="scope_id"
                        value={scope.id}
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            name="can_verify_students"
                            defaultChecked={scope.can_verify_students}
                            className="mt-1"
                          />

                          <span className="text-sm font-medium">
                            Student Verification
                          </span>
                        </label>

                        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            name="can_verify_results"
                            defaultChecked={scope.can_verify_results}
                            className="mt-1"
                          />

                          <span className="text-sm font-medium">
                            Result Verification
                          </span>
                        </label>

                        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            name="can_manage_upload_permission"
                            defaultChecked={
                              scope.can_manage_upload_permission
                            }
                            className="mt-1"
                          />

                          <span className="text-sm font-medium">
                            Upload Permission Management
                          </span>
                        </label>

                        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            name="can_approve_materials"
                            defaultChecked={
                              scope.can_approve_materials
                            }
                            className="mt-1"
                          />

                          <span className="text-sm font-medium">
                            Material Approval
                          </span>
                        </label>

                        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                          <input
                            type="checkbox"
                            name="can_publish_notices"
                            defaultChecked={
                              scope.can_publish_notices
                            }
                            className="mt-1"
                          />

                          <span className="text-sm font-medium">
                            Publish Notices
                          </span>
                        </label>

                          <label className="flex items-start gap-3 rounded-lg border border-border p-4">
                            <input
                              type="checkbox"
                              name="can_delete_notices"
                              defaultChecked={scope.can_delete_notices}
                              className="mt-1"
                            />

                            <span className="text-sm font-medium">
                              Delete Notices
                            </span>
                          </label>
                      </div>

                      <Button type="submit">
                        Update Permissions
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">
            Permission Security
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Only Super Admin can create, update, or remove Admin permission
            scopes. Admin capabilities remain subject to the server-side
            database permission checks.
          </p>
        </section>
      </div>
    </main>
  );
}


