"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  GraduationCap,
  History,
  Loader2,
  Users,
} from "lucide-react";
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
    },
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

function ModernDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const out = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 block text-xs font-semibold text-slate-300">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-800 bg-[#060A12]/60 text-slate-500 opacity-60"
            : open
              ? "cursor-pointer border-violet-400/80 bg-slate-900 text-white ring-2 ring-violet-500/20"
              : "cursor-pointer border-slate-700/80 bg-[#060A12] text-slate-200 hover:border-violet-400/50"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-violet-400" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? "bg-violet-500/15 font-semibold text-violet-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
            error instanceof Error
              ? error.message
              : "Could not load progression history.",
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

  const currentTerms = useMemo(
    () => terms.filter((term) => term.level_id === currentLevelId),
    [terms, currentLevelId],
  );

  const targetTerms = useMemo(
    () => terms.filter((term) => term.level_id === targetLevelId),
    [terms, targetLevelId],
  );

  const cohort = useMemo(
    () =>
      students.filter(
        (student) =>
          student.batch_id === batchId &&
          student.current_level_id === currentLevelId &&
          student.current_term_id === currentTermId,
      ),
    [students, batchId, currentLevelId, currentTermId],
  );

  const canReview =
    Boolean(
      batchId &&
        currentLevelId &&
        currentTermId &&
        targetLevelId &&
        targetTermId &&
        reason.trim() &&
        cohort.length > 0,
    ) && !(currentLevelId === targetLevelId && currentTermId === targetTermId);

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
        `Success: ${result.updated_count} student(s) updated. Operation ID: ${result.operation_id}`,
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
        error instanceof Error
          ? error.message
          : "Academic progression failed.",
      );
    } finally {
      setApplying(false);
    }
  }

  const batchName = batches.find((b) => b.id === batchId)?.name;
  const currentLevelName = levels.find((l) => l.id === currentLevelId)?.name;
  const currentTermName = terms.find((t) => t.id === currentTermId)?.name;
  const targetLevelName = levels.find((l) => l.id === targetLevelId)?.name;
  const targetTermName = terms.find((t) => t.id === targetTermId)?.name;

  return (
    <div className="space-y-6">
      {/* Step 01: Academic Assignment */}
      <section className="rounded-2xl border border-violet-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(139,92,246,0.08)] transition-all duration-300 hover:border-violet-400/60">
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
            Step 01
          </span>
          <h2 className="mt-1 font-serif text-lg font-bold text-white">
            Academic Assignment
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Select the batch and its current and target academic positions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ModernDropdown
            label="Batch"
            value={batchId}
            onChange={(v) => {
              setBatchId(v);
              setReviewed(false);
            }}
            placeholder="Select Batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />

          <ModernDropdown
            label="Current Level"
            value={currentLevelId}
            onChange={(v) => {
              setCurrentLevelId(v);
              setCurrentTermId("");
              setReviewed(false);
            }}
            placeholder="Current Level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
          />

          <ModernDropdown
            label="Current Term"
            value={currentTermId}
            disabled={!currentLevelId}
            onChange={(v) => {
              setCurrentTermId(v);
              setReviewed(false);
            }}
            placeholder={currentLevelId ? "Current Term" : "Level First"}
            options={currentTerms.map((t) => ({ value: t.id, label: t.name }))}
          />

          <ModernDropdown
            label="Target Level"
            value={targetLevelId}
            onChange={(v) => {
              setTargetLevelId(v);
              setTargetTermId("");
              setReviewed(false);
            }}
            placeholder="Target Level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
          />

          <ModernDropdown
            label="Target Term"
            value={targetTermId}
            disabled={!targetLevelId}
            onChange={(v) => {
              setTargetTermId(v);
              setReviewed(false);
            }}
            placeholder={targetLevelId ? "Target Term" : "Level First"}
            options={targetTerms.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="progression_reason"
            className="mb-1.5 block text-xs font-semibold text-slate-300"
          >
            Reason for progression
          </label>
          <textarea
            id="progression_reason"
            className="min-h-20 w-full resize-y rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-violet-400/80 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReviewed(false);
            }}
            placeholder="Enter the academic reason for this change..."
            maxLength={1000}
          />
        </div>
      </section>

      {/* Step 02 & Step 03 Side-by-Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Step 02: Student Preview */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Step 02
              </span>
              <h2 className="mt-1 font-serif text-lg font-bold text-white">
                Student Preview
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Students matching the selected batch and current assignment.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 px-3.5 py-2">
              <Users className="h-4 w-4 text-violet-400" />
              <span className="font-serif text-lg font-bold tabular-nums text-white">
                {cohort.length}
              </span>
              <span className="text-[11px] text-violet-300">matching</span>
            </div>
          </div>

          {!batchId || !currentLevelId || !currentTermId ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-800 bg-[#060A12]/60 p-8 text-center text-xs text-slate-400">
              Select a batch, current level and current term to preview
              students.
            </p>
          ) : cohort.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-slate-800 bg-[#060A12]/60 p-8 text-center text-xs text-slate-400">
              No students match this assignment. Check the selected academic
              values.
            </p>
          ) : (
            <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {cohort.map((student) => {
                const name = student.full_name || "Unnamed student";
                const initials = name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("") || "ST";

                return (
                  <div
                    key={student.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#060A12]/85 px-4 py-3 transition-all hover:border-violet-500/45 hover:bg-slate-900/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/15 text-xs font-bold text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {student.email || "—"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 font-mono text-xs font-medium text-slate-200">
                      Roll: {student.student_id || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 03: Review & Confirm */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
            Step 03
          </span>
          <h2 className="mt-1 font-serif text-lg font-bold text-white">
            Review &amp; Confirm
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Review the proposed change before applying progression.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-[#060A12]/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Assignment
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {batchName || "No batch selected"}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {currentLevelName || "No level"} &bull;{" "}
                {currentTermName || "No term"}
              </p>
            </div>

            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-4 py-1.5 text-xs font-semibold text-violet-200 shadow-[0_0_18px_rgba(139,92,246,0.22)]">
                <span>
                  {currentLevelName && currentTermName
                    ? `${currentLevelName} ${currentTermName}`
                    : "Current"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-violet-400" />
                <span>
                  {targetLevelName && targetTermName
                    ? `${targetLevelName} ${targetTermName}`
                    : "Target"}
                </span>
              </span>
            </div>

            <div className="rounded-xl border border-violet-500/30 bg-violet-950/15 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                Proposed Assignment
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {batchName || "No batch selected"}
              </p>
              <p className="mt-0.5 text-xs text-violet-200">
                {targetLevelName || "No target level"} &bull;{" "}
                {targetTermName || "No target term"}
              </p>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs text-slate-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-violet-500/50 bg-[#060A12] accent-violet-500"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <span>
              I have reviewed the selected cohort, current assignment, target
              assignment and reason.
            </span>
          </label>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              disabled={!canReview || !reviewed || applying}
              onClick={() => void handleApply()}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Applying Progression...</span>
                </>
              ) : (
                <span>Confirm Academic Progression</span>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              {applying
                ? "Updating student assignments..."
                : canReview && reviewed
                  ? "Review complete. Click to confirm before applying."
                  : "Complete the assignment, reason, and review to continue."}
            </p>

            {statusMessage && (
              <p
                role="status"
                className={`rounded-xl border p-3 text-xs font-medium ${
                  statusError
                    ? "border-rose-500/40 bg-rose-950/30 text-rose-300"
                    : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                {statusMessage}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm academic progression"
            className="my-auto w-full max-w-md rounded-2xl border border-violet-500/40 bg-[#0A1020] p-6 text-slate-100 shadow-[0_0_50px_rgba(139,92,246,0.25)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/15 text-violet-300">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="mt-3 font-serif text-xl font-bold text-white">
                Confirm Academic Progression
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Please review the change before applying.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-[#060A12] p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">Selected students</span>
                <span className="font-bold text-white">
                  {cohort.length} {cohort.length === 1 ? "student" : "students"}
                </span>
              </div>

              <div className="my-3 border-t border-slate-800" />

              <div className="flex items-center gap-2 text-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Current
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {currentLevelName} / {currentTermName}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" />

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    Proposed
                  </p>
                  <p className="mt-1 text-xs font-semibold text-violet-200">
                    {targetLevelName} / {targetTermName}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              This action updates student assignments and records an audit
              history.
            </p>

            <button
              type="button"
              disabled={applying || !canReview || !reviewed}
              onClick={() => void confirmApply()}
              className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? "Applying..." : "Confirm Progression"}
            </button>

            <button
              type="button"
              disabled={applying}
              onClick={() => setConfirmModalOpen(false)}
              className="mt-2.5 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Step 04: Progression History */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400">
              <History className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Step 04
              </span>
              <h2 className="font-serif text-lg font-bold text-white">
                Progression History
              </h2>
              <p className="text-xs text-slate-400">
                The latest academic progression audit records visible to your
                account.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
            {historyLoading ? "Loading..." : `${history.length} record(s)`}
          </span>
        </div>

        {historyError && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/25 p-3 text-xs text-rose-300"
          >
            History could not be loaded: {historyError}
          </p>
        )}

        {!historyLoading && !historyError && history.length === 0 && (
          <p className="mt-5 rounded-xl border border-dashed border-slate-800 bg-[#060A12]/60 p-8 text-center text-xs text-slate-400">
            No progression history records are available yet.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {history.map((item) => {
            const student = students.find(
              (entry) => entry.id === item.student_profile_id,
            );

            const previousLevelId = item.previous_state.current_level_id;
            const previousTermId = item.previous_state.current_term_id;
            const newLevelId = item.new_state.current_level_id;
            const newTermId = item.new_state.current_term_id;
            const itemBatchId = item.previous_state.batch_id;

            const previousLevel = levels.find(
              (entry) => entry.id === previousLevelId,
            );
            const previousTerm = terms.find(
              (entry) => entry.id === previousTermId,
            );
            const newLevel = levels.find((entry) => entry.id === newLevelId);
            const newTerm = terms.find((entry) => entry.id === newTermId);
            const batch = batches.find((entry) => entry.id === itemBatchId);

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-4 transition-colors hover:border-violet-500/35"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {student?.full_name || "Unknown student"}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      Student ID: {student?.student_id || "Not available"}
                    </p>
                  </div>
                  <time className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800/80 bg-[#0A1020] p-3">
                    <p className="text-[11px] font-medium text-slate-400">
                      Batch
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-white">
                      {batch?.name || "Not available"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800/80 bg-[#0A1020] p-3">
                    <p className="text-[11px] font-medium text-slate-400">
                      Reason
                    </p>
                    <p className="mt-0.5 text-xs text-slate-200">
                      {item.reason}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-slate-300">
                    {previousLevel?.name || "Unknown level"} &bull;{" "}
                    {previousTerm?.name || "Unknown term"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-violet-400" />
                  <span className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1 font-semibold text-violet-200">
                    {newLevel?.name || "Unknown level"} &bull;{" "}
                    {newTerm?.name || "Unknown term"}
                  </span>
                </div>

                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-medium text-slate-400 hover:text-violet-300">
                    Technical details
                  </summary>
                  <div className="mt-2 space-y-2 rounded-lg border border-slate-800 bg-[#0A1020] p-3 text-slate-300">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Operation ID
                      </p>
                      <p className="mt-0.5 break-all font-mono">
                        {item.operation_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Student profile ID
                      </p>
                      <p className="mt-0.5 break-all font-mono">
                        {item.student_profile_id}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          Previous state (JSON)
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-300">
                          {JSON.stringify(item.previous_state, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">
                          New state (JSON)
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-300">
                          {JSON.stringify(item.new_state, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}