"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Level = {
  id: string;
  name: string;
  sort_order: number;
};

type Term = {
  id: string;
  level_id: string;
  name: string;
  sort_order: number;
};

type SubjectFormProps = {
  departments: Department[];
  levels: Level[];
  terms: Term[];
  action: (formData: FormData) => void | Promise<void>;
};

function FormDropdown({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  name: string;
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
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-800 bg-[#060A12]/60 text-slate-500 opacity-60"
            : open
              ? "cursor-pointer border-sky-400/80 bg-slate-900 text-white ring-2 ring-sky-500/20"
              : "cursor-pointer border-slate-700/80 bg-[#060A12] text-slate-200 hover:border-sky-400/50"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-sky-400" : ""
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
                    ? "bg-sky-500/15 font-semibold text-sky-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-sky-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SubjectForm({
  departments,
  levels,
  terms,
  action,
}: SubjectFormProps) {
  const [departmentId, setDepartmentId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [termId, setTermId] = useState("");

  const filteredTerms = terms.filter(
    (term) => term.level_id === selectedLevelId,
  );

  return (
    <form
      action={action}
      className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.85fr_1fr_0.85fr_0.85fr_auto] lg:items-end"
    >
      <div>
        <label
          htmlFor="subject_name"
          className="mb-1.5 block text-xs font-semibold text-slate-300"
        >
          Subject Name
        </label>
        <input
          id="subject_name"
          name="subject_name"
          type="text"
          placeholder="e.g. Mathematics-I"
          required
          className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      <div>
        <label
          htmlFor="subject_code"
          className="mb-1.5 block text-xs font-semibold text-slate-300"
        >
          Subject Code
        </label>
        <input
          id="subject_code"
          name="subject_code"
          type="text"
          placeholder="e.g. MS 101"
          required
          className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-sky-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">
          Department
        </span>
        <FormDropdown
          name="department_id"
          value={departmentId}
          onChange={setDepartmentId}
          placeholder="Select Department"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">
          Level
        </span>
        <FormDropdown
          name="level_id"
          value={selectedLevelId}
          onChange={(val) => {
            setSelectedLevelId(val);
            setTermId("");
          }}
          placeholder="Select Level"
          options={levels.map((l) => ({ value: l.id, label: l.name }))}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">
          Term
        </span>
        <FormDropdown
          name="term_id"
          value={termId}
          onChange={setTermId}
          disabled={!selectedLevelId}
          placeholder={selectedLevelId ? "Select Term" : "Level First"}
          options={filteredTerms.map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>

      <button
        type="submit"
        disabled={!departmentId || !selectedLevelId || !termId}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.35)] transition-all duration-150 hover:from-sky-300 hover:to-sky-400 hover:shadow-[0_0_28px_rgba(56,189,248,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
      >
        <Plus className="h-4 w-4" />
        <span>Add Subject</span>
      </button>
    </form>
  );
}