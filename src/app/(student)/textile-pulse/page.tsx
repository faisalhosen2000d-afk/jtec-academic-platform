import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TextilePulseClient } from "@/components/student/TextilePulseClient";

export const dynamic = "force-dynamic";

export default async function TextilePulsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <main className="p-5 sm:p-6">
        <div className="mx-auto w-full max-w-6xl">
          <TextilePulseClient />
        </div>
      </main>
    </div>
  );
}