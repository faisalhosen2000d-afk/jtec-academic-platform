import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VirtualLabHub from "@/components/student/VirtualLabHub";

export const dynamic = "force-dynamic";

export default async function TextileToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <main className="p-4 sm:p-6">
        <div className="mx-auto w-full max-w-6xl">
          <VirtualLabHub />
        </div>
      </main>
    </div>
  );
}