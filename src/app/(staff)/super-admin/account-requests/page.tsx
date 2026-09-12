import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  approveAdministrationAccountRequest,
  rejectAdministrationAccountRequest,
} from "../users/actions";

type AccountRequest = {
  id: string;
  full_name: string;
  email: string;
  requested_role: "admin" | "moderator";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

async function handleApproveRequest(requestId: string) {
  "use server";

  await approveAdministrationAccountRequest(requestId);
}

async function handleRejectRequest(requestId: string) {
  "use server";

  await rejectAdministrationAccountRequest(requestId);
}

function ApproveButton({ requestId }: { requestId: string }) {
  return (
    <form action={handleApproveRequest.bind(null, requestId)}>
      <Button type="submit">Approve</Button>
    </form>
  );
}

function RejectButton({ requestId }: { requestId: string }) {
  return (
    <form action={handleRejectRequest.bind(null, requestId)}>
      <Button type="submit" variant="outline">
        Reject
      </Button>
    </form>
  );
}

export default async function AdministrationAccountRequestsPage() {
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

  const serviceSupabase = createServiceRoleClient();

  const { data, error } = await serviceSupabase
    .from("administration_account_requests")
    .select("id, full_name, email, requested_role, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const requests = (data ?? []) as AccountRequest[];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Account Requests
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Review and approve or reject Administrator and Moderator account
              requests.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        <section className="mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Pending account requests
            </p>

            <p className="mt-1 text-2xl font-bold">{requests.length}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">
              Pending Administration Accounts
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              These Administrator and Moderator accounts are waiting for Super
              Admin approval.
            </p>
          </div>

          {error ? (
            <div className="p-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Unable to load account requests.
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Please try again after checking the database connection and
                  permissions.
                </p>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-base font-semibold">
                No pending account requests
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                There are currently no Administrator or Moderator accounts
                waiting for approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Requested</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-5 py-4 font-medium">
                        {request.full_name}
                      </td>

                      <td className="px-5 py-4">{request.email}</td>

                      <td className="px-5 py-4 capitalize">
                        {request.requested_role}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString(
                          "en-GB",
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <ApproveButton requestId={request.id} />
                          <RejectButton requestId={request.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Approval Control</h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Account approval and rejection are handled by the existing
            server-side Super Admin functions. The interface does not bypass
            database Row Level Security (RLS).
          </p>
        </section>
      </div>
    </main>
  );
}

