"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Info, KeyRound, Plus } from "lucide-react";
import { createRegistrationCode } from "./actions";

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
  sort_order: number;
};

type Term = {
  id: string;
  level_id: string;
  name: string;
  sort_order: number;
};

type RegistrationCodeFormProps = {
  departments: Department[];
  batches: Batch[];
  levels: Level[];
  terms: Term[];
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
              ? "cursor-pointer border-cyan-400/80 bg-slate-900 text-white ring-2 ring-cyan-500/20"
              : "cursor-pointer border-slate-700/80 bg-[#060A12] text-slate-200 hover:border-cyan-400/50"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-cyan-400" : ""
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
                    ? "bg-cyan-500/15 font-semibold text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RegistrationCodeForm({
  departments,
  batches,
  levels,
  terms,
}: RegistrationCodeFormProps) {
  const [departmentId, setDepartmentId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [termId, setTermId] = useState("");

  const filteredTerms = terms
    .filter((term) => term.level_id === selectedLevelId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const ready = Boolean(departmentId && batchId && selectedLevelId && termId);

  return (
    <form
      action={createRegistrationCode}
      className="space-y-6 rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(6,182,212,0.08)] transition-all duration-300 hover:border-cyan-400/60"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-white">
            Create Registration Code
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Create a student registration code and bind it to the student&apos;s
            academic assignment.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
          <KeyRound className="h-3 w-3" />
          Auto-Generated Code
        </span>
      </div>

      {/* Automatic Code Information */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 text-xs text-slate-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <p className="leading-relaxed">
          The system will automatically generate a unique registration code when
          you submit this form.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Student ID */}
        <div>
          <label
            htmlFor="student_id"
            className="mb-1.5 block text-xs font-semibold text-slate-300"
          >
            Student ID
          </label>
          <input
            id="student_id"
            name="student_id"
            type="text"
            required
            placeholder="e.g. 24060401021"
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Department */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Department
          </span>
          <FormDropdown
            name="department_id"
            value={departmentId}
            onChange={setDepartmentId}
            placeholder="Select Department"
            options={departments.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.code})`,
            }))}
          />
        </div>

        {/* Batch */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Batch
          </span>
          <FormDropdown
            name="batch_id"
            value={batchId}
            onChange={setBatchId}
            placeholder="Select Batch"
            options={batches.map((b) => ({ value: b.id, label: b.name }))}
          />
        </div>

        {/* Level */}
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
            options={levels
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((l) => ({ value: l.id, label: l.name }))}
          />
        </div>

        {/* Term */}
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Term
          </span>
          <FormDropdown
            name="term_id"
            value={termId}
            onChange={setTermId}
            disabled={!selectedLevelId}
            placeholder={selectedLevelId ? "Select Term" : "Select Level First"}
            options={filteredTerms.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>

        {/* Maximum Uses */}
        <div>
          <label
            htmlFor="max_uses"
            className="mb-1.5 block text-xs font-semibold text-slate-300"
          >
            Maximum Uses
          </label>
          <input
            id="max_uses"
            name="max_uses"
            type="number"
            min="1"
            defaultValue="1"
            required
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Expiry */}
        <div className="md:col-span-2">
          <label
            htmlFor="expires_at"
            className="mb-1.5 block text-xs font-semibold text-slate-300"
          >
            Expiry Date &amp; Time (Leave empty for no expiry)
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white [color-scheme:dark] transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={!ready}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(6,182,212,0.3)] transition-all duration-150 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Registration Code</span>
          </button>
        </div>
      </div>
    </form>
  );
}