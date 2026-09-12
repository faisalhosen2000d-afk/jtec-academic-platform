import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bulkCreateRegistrationCodes } from "./actions";
import BulkRegistrationForm from "./bulk-registration-form";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Batch = {
  id: string;
  name: string;
};

type Level = {
  id: string;
  name: string;
};

type Term = {
  id: string;
  level_id: string;
  name: string;
};

export default async function BulkRegistrationCodesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") {
    return null;
  }

  const [
    departmentsResult,
    batchesResult,
    levelsResult,
    termsResult,
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code")
      .order("name"),

    supabase
      .from("batches")
      .select("id, name")
      .order("name"),

    supabase
      .from("levels")
      .select("id, name")
      .order("sort_order"),

    supabase
      .from("terms")
      .select("id, level_id, name")
      .order("level_id")
      .order("sort_order"),
  ]);

  const departments =
    (departmentsResult.data ?? []) as Department[];

  const batches =
    (batchesResult.data ?? []) as Batch[];

  const levels =
    (levelsResult.data ?? []) as Level[];

  const terms =
    (termsResult.data ?? []) as Term[];

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Super Admin / Registration Codes
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Bulk Registration
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Upload a student list and assign one academic structure to all students.
            </p>
          </div>

          <Link
            href="/super-admin/registration-codes/manage"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Back to Registration Codes
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <BulkRegistrationForm
            departments={departments}
            batches={batches}
            levels={levels}
            terms={terms}
            action={bulkCreateRegistrationCodes}
          />
        </section>
      </div>
    </main>
  );
}