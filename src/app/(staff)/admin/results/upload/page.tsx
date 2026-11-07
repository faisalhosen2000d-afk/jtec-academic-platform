import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultUploadClient from "./ResultUploadClient";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminResultUploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch departments, batches, levels, terms
  const [
    { data: departments },
    { data: batches },
    { data: levels },
    { data: terms },
  ] = await Promise.all([
    supabase.from("departments").select("id, name, code").order("name"),
    supabase.from("batches").select("id, name").order("name"),
    supabase.from("levels").select("id, name").order("name"),
    supabase.from("terms").select("id, name").order("name"),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Academic Examination Office
          </p>
          <h1 className="text-2xl font-bold mt-1">Publish Term Results & Air Drops</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Upload official term results, verify missing student rolls, and handle air drop batch migrations with automated audit tracking.
          </p>
        </div>
        <Link href={profile.role === "super_admin" ? "/super-admin" : "/admin"}>
          <Button variant="outline" className="rounded-xl text-xs">
            {profile.role === "super_admin" ? "Back to Super Admin" : "Back to Admin Panel"}
          </Button>
        </Link>
      </div>

      <ResultUploadClient
        departments={departments || []}
        batches={batches || []}
        levels={levels || []}
        terms={terms || []}
      />
    </div>
  );
}