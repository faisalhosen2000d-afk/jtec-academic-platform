"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Batch = { id: string; name: string };

type ProgressionHistoryRow = {
  id: string;
  operation_id: string;
  student_profile_id: string;
  actor_id: string | null;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  reason: string;
  created_at: string;
};

type ProgressionDb = {
  from: (table: "academic_progression_history") => {
    select: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => {
        limit: (count: number) => Promise<{
          data: ProgressionHistoryRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  rpc: (
    fn: "apply_academic_progression",
    args: {
      p_batch_id: string;
      p_expected_current_level_id: string;
      p_expected_current_term_id: string;
      p_target_level_id: string;
      p_target_term_id: string;
      p_expected_student_ids: string[];
      p_reason: string;
    }
  ) => Promise<{
    data: { operation_id: string; updated_count: number }[] | null;
    error: { message: string } | null;
  }>;
};
type Level = { id: string; name: string; sort_order: number };
type Term = { id: string; level_id: string; name: string; sort_order: number };
type Student = {
  id: string;
  full_name: string | null;
  student_id: string | null;
  email: string | null;
  batch_id: string | null;
  current_level_id: string | null;
  current_term_id: string | null;
};

type Props = {
  batches: Batch[];
  levels: Level[];
  terms: Term[];
  students: Student[];
};

const fieldClass =
  "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function AssignmentSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export default function AcademicProgressionPanel({
  batches,
  levels,
  terms,
  students,
}: Props) {
  const [batchId, setBatchId] = useState("");
  const [currentLevelId, setCurrentLevelId] = useState("");
  const [currentTermId, setCurrentTermId] = useState("");
  const [targetLevelId, setTargetLevelId] = useState("");
  const [targetTermId, setTargetTermId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);



  const [applying, setApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [history, setHistory] = useState<ProgressionHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const db = createClient() as unknown as ProgressionDb;
        const { data, error } = await db
          .from("academic_progression_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw new Error(error.message);
        if (active) setHistory(data ?? []);
      } catch (error) {
        if (active) {
          setHistoryError(
            error instanceof Error ? error.message : "Could not load progression history."
          );
        }
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  function handleApply() {
    if (!canReview || !reviewed || applying) return;
    setConfirmModalOpen(true);
  }

  async function confirmApply() {
    if (!canReview || !reviewed || applying) return;
    setConfirmModalOpen(false);
    setApplying(true);
    setStatusMessage("");
    setStatusError(false);

    try {
      const db = createClient() as unknown as ProgressionDb;
      const { data, error } = await db.rpc("apply_academic_progression", {
        p_batch_id: batchId,
        p_expected_current_level_id: currentLevelId,
        p_expected_current_term_id: currentTermId,
        p_target_level_id: targetLevelId,
        p_target_term_id: targetTermId,
        p_expected_student_ids: cohort.map((student) => student.id),
        p_reason: reason.trim(),
      });

      if (error) throw new Error(error.message);

      const result = data?.[0];
      if (!result) {
        throw new Error("The database returned no progression result.");
      }

      setStatusMessage(
        `Success: ${result.updated_count} student(s) updated. Operation ID: ${result.operation_id}`
      );
      setReviewed(false);

      const { data: refreshedHistory, error: historyLoadError } = await db
        .from("academic_progression_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyLoadError) {
        setHistoryError(historyLoadError.message);
      } else {
        setHistory(refreshedHistory ?? []);
        setHistoryError("");
      }

      window.location.reload();
    } catch (error) {
      setStatusError(true);
      setStatusMessage(
        error instanceof Error ? error.message : "Academic progression failed."
      );
    } finally {
      setApplying(false);
    }
  }
  const currentTerms = useMemo(
    () => terms.filter((term) => term.level_id === currentLevelId),
    [terms, currentLevelId]
  );

  const targetTerms = useMemo(
    () => terms.filter((term) => term.level_id === targetLevelId),
    [terms, targetLevelId]
  );

  const cohort = useMemo(
    () =>
      students.filter(
        (student) =>
          student.batch_id === batchId &&
          student.current_level_id === currentLevelId &&
          student.current_term_id === currentTermId
      ),
    [students, batchId, currentLevelId, currentTermId]
  );

  const canReview =
    Boolean(batchId && currentLevelId && currentTermId &&
      targetLevelId && targetTermId && reason.trim() && cohort.length > 0) &&
    !(currentLevelId === targetLevelId && currentTermId === targetTermId);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step 01
          </p>
          <h2 className="mt-1 text-xl font-semibold">Academic Assignment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the batch and its current and target academic positions.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <AssignmentSelect label="Batch" value={batchId} onChange={(v) => { setBatchId(v); setReviewed(false); }}>
            <option value="">Select batch</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </AssignmentSelect>

          <AssignmentSelect label="Current Level" value={currentLevelId} onChange={(v) => { setCurrentLevelId(v); setCurrentTermId(""); setReviewed(false); }}>
            <option value="">Select current level</option>
            {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
          </AssignmentSelect>

          <AssignmentSelect label="Current Term" value={currentTermId} onChange={(v) => { setCurrentTermId(v); setReviewed(false); }}>
            <option value="">Select current term</option>
            {currentTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
          </AssignmentSelect>

          <div className="grid gap-4 sm:grid-cols-2">
            <AssignmentSelect label="Target Level" value={targetLevelId} onChange={(v) => { setTargetLevelId(v); setTargetTermId(""); setReviewed(false); }}>
              <option value="">Select target level</option>
              {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </AssignmentSelect>
            <AssignmentSelect label="Target Term" value={targetTermId} onChange={(v) => { setTargetTermId(v); setReviewed(false); }}>
              <option value="">Select target term</option>
              {targetTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </AssignmentSelect>
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium">
          Reason for progression
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReviewed(false); }}
            placeholder="Enter the academic reason for this change..."
            maxLength={1000}
          />
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Step 02
            </p>
            <h2 className="mt-1 text-xl font-semibold">Student Preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Students matching the selected batch and current assignment.
            </p>
          </div>
          <div className="rounded-lg bg-muted px-4 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{cohort.length}</p>
            <p className="text-xs text-muted-foreground">Matching students</p>
          </div>
        </div>

        {!batchId || !currentLevelId || !currentTermId ? (
          <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Select a batch, current level and current term to preview students.
          </p>
        ) : cohort.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No students match this assignment. Check the selected academic values.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Student ID</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cohort.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium">{student.full_name || "Unnamed student"}</td>
                    <td className="px-4 py-3">{student.student_id || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.email || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Step 03
        </p>
        <h2 className="mt-1 text-xl font-semibold">Review & Confirm</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the proposed change. No student records are modified by this preview.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current assignment</p>
            <p className="mt-2 font-semibold">{batches.find((b) => b.id === batchId)?.name || "No batch selected"}</p>
            <p className="mt-1 text-sm">{levels.find((l) => l.id === currentLevelId)?.name || "No level selected"}</p>
            <p className="text-sm text-muted-foreground">{terms.find((t) => t.id === currentTermId)?.name || "No term selected"}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed assignment</p>
            <p className="mt-2 font-semibold">{batches.find((b) => b.id === batchId)?.name || "No batch selected"}</p>
            <p className="mt-1 text-sm">{levels.find((l) => l.id === targetLevelId)?.name || "No target level selected"}</p>
            <p className="text-sm text-muted-foreground">{terms.find((t) => t.id === targetTermId)?.name || "No target term selected"}</p>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          <span>I have reviewed the selected cohort, current assignment, target assignment and reason.</span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canReview || !reviewed || applying}
            onClick={() => void handleApply()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? "Applying..." : "Apply progression"}
          </button>
          <span className="text-xs text-muted-foreground">
            {applying
              ? "Updating student assignments..."
              : canReview && reviewed
                ? "Review complete. Confirm before applying."
                : "Complete the assignment and review to continue."}
          </span>
          {statusMessage && (
            <p role="status" className={`w-full text-sm ${statusError ? "text-destructive" : "text-green-700"}`}>
              {statusMessage}
            </p>
          )}
        </div>
      </section>

      <style jsx global>{`
        @keyframes academicModalEnter {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {confirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm academic progression"
            className="my-auto w-full max-w-md rounded-[22px] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6"
            style={{ animation: "academicModalEnter 220ms ease-out" }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-50">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2 9 10-5 10 5-10 5L2 9Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 11v5c3.5 3 8.5 3 12 0v-5M22 9v6" />
                </svg>
              </div>
              <h2 className="mt-3 text-center text-xl font-semibold tracking-tight">
                Confirm Academic Progression
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Please review the change before applying.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">Selected students</span>
                <span className="text-sm font-semibold">
                  {cohort.length} {cohort.length === 1 ? "student" : "students"}
                </span>
              </div>

              <div className="my-4 border-t border-slate-200" />

              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current</p>
                  <p className="mt-2 text-sm font-semibold sm:text-base">
                    {levels.find((l) => l.id === currentLevelId)?.name}
                    {" / "}
                    {terms.find((t) => t.id === currentTermId)?.name}
                  </p>
                </div>

                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                </svg>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Proposed</p>
                  <p className="mt-2 text-sm font-semibold sm:text-base">
                    {levels.find((l) => l.id === targetLevelId)?.name}
                    {" / "}
                    {terms.find((t) => t.id === targetTermId)?.name}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              This action updates student assignments and records an audit history.
            </p>

            <button
              type="button"
              disabled={applying || !canReview || !reviewed}
              onClick={() => void confirmApply()}
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? "Applying..." : "Confirm Progression"}
            </button>

            <button
              type="button"
              disabled={applying}
              onClick={() => setConfirmModalOpen(false)}
              className="mt-2.5 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step 04</p>
      <h2 className="mt-1 text-xl font-semibold">Progression History</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The latest academic progression audit records visible to your account.
      </p>
    </div>
    <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium">
      {historyLoading ? "Loading..." : `${history.length} record(s)`}
    </span>
  </div>

  {historyError && (
    <p role="alert" className="mt-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
      History could not be loaded: {historyError}
    </p>
  )}

  {!historyLoading && !historyError && history.length === 0 && (
    <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      No progression history records are available yet.
    </p>
  )}

  <div className="mt-5 space-y-3">
    {history.map((item) => (
      <article key={item.id} className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">{item.reason}</p>
          <time className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleString()}
          </time>
        </div>
        <p className="mt-2 break-all text-xs text-muted-foreground">
          Student profile: {item.student_profile_id}
        </p>
        <p className="mt-1 break-all text-xs text-muted-foreground">
          Operation: {item.operation_id}
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium">View assignment change</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Previous state</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                {JSON.stringify(item.previous_state, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">New state</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                {JSON.stringify(item.new_state, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </article>
    ))}
  </div>
</section>
    </div>
  );
}