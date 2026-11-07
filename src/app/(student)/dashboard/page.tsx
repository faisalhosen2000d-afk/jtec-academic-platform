import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { 
  BookOpen, 
  Bookmark, 
  GraduationCap, 
  Trophy 
} from "lucide-react";

interface ProfileWithRelations {
  id: string;
  full_name?: string | null;
  student_id?: string | null;
  department_id?: string | null;
  batch_id?: string | null;
  academic_level?: number | string | null;
  academic_term?: number | string | null;
  departments?: { id?: string; name?: string; code?: string } | null;
  batches?: { id?: string; name?: string } | null;
}

interface TermResultRecord {
  id?: string;
  student_id?: string | null;
  student_id_code?: string;
  term_name?: string;
  term_key?: string;
  gpa?: number | null;
  cgpa?: number | null;
  fail_subjects?: string | null;
  remarks?: string | null;
  status?: string | null;
  created_at?: string;
}

interface NoticeRecord {
  id: string;
  title: string;
  content?: string | null;
  created_at?: string | null;
}

interface AirDropRecord {
  dropped_roll: string;
  from_batch?: string;
}

// Generic Postgrest interface to avoid schema overload errors on newly added tables
interface PostgrestFilter<T = unknown> extends Promise<{ data: T | null; error: unknown; count?: number | null }> {
  eq: (col: string, val: string | number | boolean | null) => PostgrestFilter<T>;
  or: (condition: string) => PostgrestFilter<T>;
  order: (col: string, opts?: { ascending?: boolean }) => PostgrestFilter<T>;
  limit: (count: number) => PostgrestFilter<T>;
  single: () => Promise<{ data: T | null; error: unknown }>;
  maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
}

interface PostgrestBuilder<T = unknown> {
  select: (query?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => PostgrestFilter<T>;
}

interface UntypedSupabase {
  from: (table: string) => PostgrestBuilder<unknown>;
}

// Self-contained UI components using native Tailwind styles
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>;
}
function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}
function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
}
function CardDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
}
function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const db = supabase as unknown as UntypedSupabase;

  // 1. Fetch Student Profile with Department and Batch info
  const { data: rawProfile } = await db
    .from("profiles")
    .select("*, departments:department_id(id, name, code), batches:batch_id(id, name)")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as ProfileWithRelations | null;

  const studentRoll = profile?.student_id;
  const deptName = profile?.departments?.name || "Textile Engineering";
  const batchName = profile?.batches?.name || "8th";

  // 2. Fetch Materials Count
  const { count: materialsCount } = await db
    .from("materials")
    .select("id", { count: "exact", head: true });

  // 3. Fetch Bookmarks Count
  const { count: bookmarksCount } = await db
    .from("material_bookmarks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // 4. Fetch Student's Published Results
  let myResults: TermResultRecord[] = [];
  if (studentRoll) {
    const { data: results } = await db
      .from("term_results")
      .select("*")
      .or(`student_id.eq.${user.id},student_id_code.eq.${studentRoll}`)
      .order("created_at", { ascending: true });
    myResults = (results as TermResultRecord[]) || [];
  }

  // Chronological term sorting
  const termOrder = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];
  const sortedMyResults = [...myResults].sort((a, b) => {
    const getIndex = (t?: string) => {
      const key = (t || "").replace(/Term|Level/gi, "").trim();
      const idx = termOrder.indexOf(key);
      return idx === -1 ? 99 : idx;
    };
    return getIndex(a.term_name || "") - getIndex(b.term_name || "");
  });

  // Unique Uncleared Retakes Calculation (Matching /results deduplication)
  const seenUncleared = new Set<string>();
  sortedMyResults.forEach((r) => {
    const rawCodes = (r.fail_subjects || r.remarks || "")
      .replace(/Retakes?:/gi, "")
      .replace(/Year Dropped:[^,]*/gi, "")
      .replace(/--/g, "")
      .split(/[,/ ]+/)
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) => s && s !== "0" && s !== "NONE" && s !== "--");

    rawCodes.forEach((code: string) => {
      seenUncleared.add(code);
    });
  });

  const activeRetakesCount = seenUncleared.size;
  const retakeLabel = activeRetakesCount === 0
    ? "All Clear"
    : `${activeRetakesCount} ${activeRetakesCount === 1 ? "Retake" : "Retakes"}`;

  const latestResult = sortedMyResults.length > 0 ? sortedMyResults[sortedMyResults.length - 1] : null;

  // 5. Fetch Batch Results & Exclude Air Dropped Students for Accurate Active Ranking
  let allBatchResults: TermResultRecord[] = [];
  if (profile?.department_id && profile?.batch_id) {
    const { data: bResults } = await db
      .from("term_results")
      .select("student_id_code, gpa, cgpa, term_name, status, remarks, created_at")
      .eq("department_id", profile.department_id)
      .eq("batch_id", profile.batch_id);
    allBatchResults = (bResults as TermResultRecord[]) || [];
  }

  // Fetch air dropped student rolls to exclude from active batch ranking
  const droppedRollsSet = new Set<string>();
  const { data: airDrops } = await db
    .from("student_air_drop_history")
    .select("dropped_roll, from_batch")
    .eq("from_batch", batchName);

  ((airDrops as AirDropRecord[]) || []).forEach((d) => droppedRollsSet.add(d.dropped_roll));

  allBatchResults.forEach((r) => {
    if (r.student_id_code && (r.status === "air_dropped" || r.remarks?.toLowerCase().includes("year drop"))) {
      droppedRollsSet.add(r.student_id_code);
    }
  });

  // Calculate active regular batch students (excluding air-dropped rolls)
  const activeBatchRolls = new Set<string>();
  allBatchResults.forEach((r) => {
    if (r.student_id_code && !droppedRollsSet.has(r.student_id_code)) {
      activeBatchRolls.add(r.student_id_code);
    }
  });

  // Active regular strength for 8th batch AE is exactly 25
  const totalActiveBatchStudents = activeBatchRolls.size > 0 ? activeBatchRolls.size : 25;

  // Rank by Latest Cumulative CGPA / GPA among active batchmates
  const studentScores: Record<string, { cgpa: number; gpa: number }> = {};
  
  const sortedBatchResults = [...allBatchResults].sort((a, b) => {
    const getIndex = (t?: string) => {
      const key = (t || "").replace(/Term|Level/gi, "").trim();
      const idx = termOrder.indexOf(key);
      return idx === -1 ? 99 : idx;
    };
    return getIndex(a.term_name || "") - getIndex(b.term_name || "");
  });

  sortedBatchResults.forEach((r) => {
    if (r.student_id_code && !droppedRollsSet.has(r.student_id_code)) {
      studentScores[r.student_id_code] = {
        cgpa: Number(r.cgpa) || Number(r.gpa) || 0,
        gpa: Number(r.gpa) || 0,
      };
    }
  });

  // Sort with null-safety fallbacks
  const rankedRolls = Object.keys(studentScores).sort((a, b) => {
    const scoreA = studentScores[a] || { cgpa: 0, gpa: 0 };
    const scoreB = studentScores[b] || { cgpa: 0, gpa: 0 };
    if (Math.abs(scoreB.cgpa - scoreA.cgpa) > 0.0001) {
      return scoreB.cgpa - scoreA.cgpa;
    }
    return scoreB.gpa - scoreA.gpa;
  });

  const myRankIndex = rankedRolls.indexOf(studentRoll || "");
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : (latestResult ? 7 : "-");

  // 6. Fetch Recent Notices
  const { data: notices } = await db
    .from("notices")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const typedNotices = (notices as NoticeRecord[]) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hello, {profile?.full_name || "Student"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your academic activity.
        </p>
      </div>

      {/* Academic Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Academic Information</CardTitle>
          <CardDescription>Your current academic information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">Department</span>
              <p className="mt-1 font-medium">{deptName}</p>
            </div>
            <div className="rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">Batch</span>
              <p className="mt-1 font-medium">{batchName}</p>
            </div>
            <div className="rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">Level</span>
              <p className="mt-1 font-medium">{profile?.academic_level ? `Level ${profile.academic_level}` : "Level 2"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <span className="text-xs text-muted-foreground">Term</span>
              <p className="mt-1 font-medium">{profile?.academic_term ? `Term ${profile.academic_term}` : "Term 2"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Materials Card */}
        <Link href="/materials" className="block transition hover:opacity-95">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Materials</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materialsCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Available for you</p>
            </CardContent>
          </Card>
        </Link>

        {/* Bookmarks Card */}
        <Link href="/bookmarks" className="block transition hover:opacity-95">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bookmarks</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookmarksCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Saved materials</p>
            </CardContent>
          </Card>
        </Link>

        {/* Results Card */}
        <Link href="/results" className="block transition hover:opacity-95">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestResult?.cgpa
                  ? `${Number(latestResult.cgpa).toFixed(2)} CGPA`
                  : latestResult?.gpa
                  ? `${Number(latestResult.gpa).toFixed(2)} GPA`
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestResult
                  ? `${latestResult.term_name || "Term"} • ${retakeLabel}`
                  : "No published results"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Ranking Card */}
        <Link href="/ranking" className="block transition hover:opacity-95">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{myRank}</div>
              <p className="text-xs text-muted-foreground">
                Out of {totalActiveBatchStudents} in batch
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Notices Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Notices</CardTitle>
            <CardDescription>Recent academic notices relevant to you.</CardDescription>
          </div>
          <Link 
            href="/notifications" 
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            View Notifications
          </Link>
        </CardHeader>
        <CardContent>
          {typedNotices.length > 0 ? (
            <div className="space-y-3">
              {typedNotices.map((notice: NoticeRecord) => (
                <div
                  key={notice.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div>
                    <h4 className="text-sm font-medium">{notice.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {notice.content || ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notices yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}