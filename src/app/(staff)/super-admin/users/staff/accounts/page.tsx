import Link from "next/link";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { PasswordInput } from "@/components/ui/password-input";

type StaffRole = "admin" | "moderator";

type StaffAccount = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
};

type CreateStaffResult =
  | {
      success: true;
      error?: never;
    }
  | {
      success: false;
      error: string;
    };

async function createStaffAccount(
  formData: FormData,
): Promise<CreateStaffResult> {
  "use server";

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as StaffRole;

  if (!fullName) {
    return {
      success: false,
      error: "Full name is required.",
    };
  }

  if (fullName.length > 150) {
    return {
      success: false,
      error: "Full name is too long.",
    };
  }

  if (!email || !email.includes("@")) {
    return {
      success: false,
      error: "A valid email address is required.",
    };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  if (role !== "admin" && role !== "moderator") {
    return {
      success: false,
      error: "Invalid staff role.",
    };
  }

  const authSupabase = await createClient();

  const {
    data: { user: actor },
    error: actorError,
  } = await authSupabase.auth.getUser();

  if (actorError || !actor) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const { data: actorProfile, error: actorProfileError } =
    await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", actor.id)
      .single();

  if (
    actorProfileError ||
    !actorProfile ||
    actorProfile.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "You are not authorized to create staff accounts.",
    };
  }

  const serviceSupabase = createServiceRoleClient();

  const provisioningToken = randomBytes(32).toString("hex");

  const { error: provisioningRequestError } = await serviceSupabase
    .from("staff_provisioning_requests")
    .insert({
      token: provisioningToken,
      role,
      full_name: fullName,
      email,
      created_by: actor.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

  if (provisioningRequestError) {
    return {
      success: false,
      error: `Provisioning request failed: ${provisioningRequestError.message}`,
    };
  }

  const { data: existingProfile, error: existingProfileError } =
    await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

  if (existingProfileError) {
    return {
      success: false,
      error: "Could not check whether this email is already registered.",
    };
  }

  if (existingProfile) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  const { data: createdUser, error: createUserError } =
    await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        staff_provisioning_token: provisioningToken,
      },
    });

  if (createUserError || !createdUser.user) {
    return {
      success: false,
      error:
        createUserError?.message ??
        "Staff authentication account could not be created.",
    };
  }


  revalidatePath("/super-admin/users/staff/accounts");
  revalidatePath("/super-admin/users/staff");

  return {
    success: true,
  };
}

async function handleCreateStaffAccount(
  formData: FormData,
): Promise<void> {
  "use server";

  const result = await createStaffAccount(formData);

  if (result.success) {
    redirect("/super-admin/users/staff/accounts?created=1");
  }

  redirect(
    `/super-admin/users/staff/accounts?error=${encodeURIComponent(result.error)}`,
  );
}

export default async function StaffAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/super-admin");
  }

  const { data: staffAccounts, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .in("role", ["admin", "moderator"])
    .order("created_at", { ascending: false });

  const accounts = (staffAccounts ?? []) as StaffAccount[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Staff Accounts
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Create and view Admin and Moderator staff accounts.
            </p>
          </div>

          <Link href="/super-admin/users/staff">
            <Button variant="outline">Back to Staff Management</Button>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                Create Staff Account
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Create an Admin or Moderator account for staff platform access.
              </p>
            </div>

            <form
              action={handleCreateStaffAccount}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label
                  htmlFor="full_name"
                  className="text-sm font-medium"
                >
                  Full Name
                </label>

                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  maxLength={150}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Staff full name"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium"
                >
                  Staff Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="staff@example.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                >
                  Initial Password
                </label>

                <PasswordInput
                  id="password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  showStrength
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="role"
                  className="text-sm font-medium"
                >
                  Staff Role
                </label>

                <select
                  id="role"
                  name="role"
                  defaultValue="admin"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>

              <Button type="submit" className="w-full">
                Create Staff Account
              </Button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Existing Staff
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {accounts.length} Admin/Moderator account
                  {accounts.length === 1 ? "" : "s"} found.
                </p>
              </div>
            </div>

            {staffError ? (
              <p className="text-sm text-red-600">
                Unable to load staff accounts. Please try again.
              </p>
            ) : accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="font-medium">No staff accounts yet.</p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Create an Admin or Moderator account using the form.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Name
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Email
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Role
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {accounts.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {account.full_name}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {account.email}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium capitalize">
                            {account.role}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(
                            account.created_at,
                          ).toLocaleDateString("en-GB")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">
            Account Security
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Staff accounts are created server-side. Authentication credentials
            are handled by Supabase Auth, while staff role information is stored
            in the platform profile. Permission scopes are managed separately.
          </p>
        </section>
      </div>
    </main>
  );
}










