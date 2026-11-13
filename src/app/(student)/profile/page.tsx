import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BadgeCheck, Mail, ShieldCheck, User } from "lucide-react";
import StudentContactSettings from "@/components/student/StudentContactSettings";
import StudentProfilePhoto from "@/components/student/StudentProfilePhoto";
import StudentFullNameEditor from "@/components/student/StudentFullNameEditor";

export default async function StudentProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, student_id, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: contactData } = await supabase
    .from("profile_contacts")
    .select(
      "email, phone, whatsapp, facebook, instagram, linkedin, telegram",
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  const fullName =
    profileData?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Student";

  const studentId =
    profileData?.student_id ||
    user.user_metadata?.student_id ||
    "Student";

  const profileEmail = profileData?.email || user.email || "";

  const initialContactValues = {
    email: contactData?.email ?? "",
    phone: contactData?.phone ?? "",
    whatsapp: contactData?.whatsapp ?? "",
    facebook: contactData?.facebook ?? "",
    instagram: contactData?.instagram ?? "",
    linkedin: contactData?.linkedin ?? "",
    telegram: contactData?.telegram ?? "",
  };

  return (
    <div className="min-h-full bg-[#060A12] text-slate-100">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-stagger-1 { animation: dashFadeUp 0.45s ease-out both; }
        .dash-stagger-2 { animation: dashFadeUp 0.45s ease-out 0.08s both; }
        .dash-stagger-3 { animation: dashFadeUp 0.45s ease-out 0.16s both; }
        .dash-stagger-4 { animation: dashFadeUp 0.45s ease-out 0.24s both; }
      `}</style>
      <div className="flex min-h-full">

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="flex-1 p-5 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {/* Identity Hero Banner */}
              <section className="dash-stagger-1 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#091B1E] via-[#0A1120] to-[#070C17] p-5 sm:p-6 shadow-[0_0_36px_rgba(16,185,129,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/55">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {profileData?.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt={fullName}
                        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-emerald-400/50"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 text-2xl font-bold text-emerald-300">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                        <BadgeCheck className="h-3 w-3" />
                        Verified Student
                      </span>
                      <h1 className="mt-1.5 truncate font-serif text-xl font-bold text-white sm:text-2xl">
                        {fullName}
                      </h1>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                        ID: {studentId} &bull; {profileEmail || "No email"}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 sm:self-center">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Session Active
                  </span>
                </div>
              </section>

              {/* Account & Academic Info */}
              <section className="dash-stagger-2 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 sm:p-6 shadow-xl transition-all duration-200 hover:border-cyan-500/35">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-white">
                      Student Profile
                    </h2>
                    <p className="text-xs text-slate-400">
                      Your account and academic information.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <StudentFullNameEditor initialName={fullName} />
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0E172A] px-4 py-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      Student ID
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-white">
                      {studentId}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#0E172A] px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      <Mail className="h-3 w-3 text-cyan-400" />
                      Account Email
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-100">
                      {profileEmail || "Not available"}
                    </p>
                  </div>
                </div>
              </section>

              <div className="dash-stagger-3">
                <StudentProfilePhoto
                  userId={user.id}
                  fullName={fullName}
                  initialAvatarUrl={profileData?.avatar_url ?? null}
                />
              </div>

              <div className="dash-stagger-4">
                <StudentContactSettings initialValues={initialContactValues} />
              </div>

              {/* Security Footer */}
              <section className="dash-stagger-4 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-4 sm:p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Account session active
                    </p>
                    <p className="text-xs text-slate-400">
                      You are securely signed in to the JTEC Academic Platform.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}