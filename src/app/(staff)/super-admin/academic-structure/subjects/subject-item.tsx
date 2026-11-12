"use client";

import { useState } from "react";
import { Edit3, Save, Trash2, X } from "lucide-react";

type SubjectItemProps = {
  subject: {
    id: string;
    department_id: string;
    level_id: string;
    term_id: string;
    subject_code: string;
    subject_name: string;
  };
  departmentLabel?: string;
  levelLabel?: string;
  termLabel?: string;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function SubjectItem({
  subject,
  departmentLabel,
  levelLabel,
  termLabel,
  updateAction,
  deleteAction,
}: SubjectItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="rounded-xl border border-sky-500/40 bg-[#060A12] p-4 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
        <form
          action={async (formData) => {
            await updateAction(formData);
            setIsEditing(false);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="id" value={subject.id} />
          <input type="hidden" name="department_id" value={subject.department_id} />
          <input type="hidden" name="level_id" value={subject.level_id} />
          <input type="hidden" name="term_id" value={subject.term_id} />

          <div className="sm:w-40">
            <label
              htmlFor={`edit-code-${subject.id}`}
              className="mb-1 block text-[11px] font-semibold text-slate-400"
            >
              Subject Code
            </label>
            <input
              id={`edit-code-${subject.id}`}
              name="subject_code"
              type="text"
              defaultValue={subject.subject_code}
              required
              className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#0A1020] px-3 text-xs text-white focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor={`edit-name-${subject.id}`}
              className="mb-1 block text-[11px] font-semibold text-slate-400"
            >
              Subject Name
            </label>
            <input
              id={`edit-name-${subject.id}`}
              name="subject_name"
              type="text"
              defaultValue={subject.subject_name}
              required
              className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#0A1020] px-3 text-xs text-white focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/25 active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/90 bg-[#060A12]/80 px-4 py-3.5 transition-all hover:border-sky-500/40 hover:bg-slate-900/45 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.18)]">
          {subject.subject_code}
        </span>
        <span className="truncate text-sm font-semibold text-white">
          {subject.subject_name}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <div className="flex flex-wrap items-center gap-1.5">
          {departmentLabel && (
            <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              {departmentLabel}
            </span>
          )}
          {levelLabel && (
            <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              {levelLabel}
            </span>
          )}
          {termLabel && (
            <span className="rounded-md border border-slate-700/80 bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              {termLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 text-xs font-semibold text-slate-200 transition-all hover:border-sky-400/60 hover:text-sky-300 active:scale-95"
          >
            <Edit3 className="h-3 w-3" />
            <span>Edit</span>
          </button>

          <form action={deleteAction}>
            <input type="hidden" name="id" value={subject.id} />
            <button
              type="submit"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/20 active:scale-95"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}