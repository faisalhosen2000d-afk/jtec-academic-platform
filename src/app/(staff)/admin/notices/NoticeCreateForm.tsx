"use client";

import { useState, useEffect, useRef } from "react";
import { publishNotice } from "@/server/actions/notices";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Paperclip, Pin } from "lucide-react";

type Option = {
  id: string;
  name: string;
};

type TermOption = Option & {
  level_id: string;
};

type NoticeCreateFormProps = {
  departments: Option[];
  categories: Option[];
  batches: Option[];
  levels: Option[];
  terms: TermOption[];
  canPublish: boolean;
};

function ModernDropdown({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  name?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-xs font-medium transition-all ${
          disabled
            ? "cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-500 opacity-60"
            : open
              ? "cursor-pointer border-cyan-400/80 bg-slate-900 text-white ring-2 ring-cyan-500/20"
              : "cursor-pointer border-cyan-500/25 bg-gradient-to-r from-slate-950 via-cyan-950/25 to-slate-950 text-slate-200 hover:border-cyan-400/50"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0B1224]/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500/15 font-semibold text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NoticeCreateForm({
  departments,
  categories,
  batches,
  levels,
  terms,
  canPublish,
}: NoticeCreateFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("error");

  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const hasDepartment = Boolean(selectedDepartmentId);
  const isOthersCategory =
    categories.find((category) => category.id === selectedCategoryId)?.name ===
    "Others";

  const visibleTerms = selectedLevelId
    ? terms.filter((term) => term.level_id === selectedLevelId)
    : [];

  function handleDepartmentChange(value: string) {
    setSelectedDepartmentId(value);
    setSelectedBatchId("");
    setSelectedLevelId("");
    setSelectedTermId("");
  }

  function handleLevelChange(value: string) {
    setSelectedLevelId(value);
    setSelectedTermId("");
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await publishNotice(formData);

      if (result.success) {
        setMessageType("success");
        setMessage("Notice published successfully.");
        formRef.current?.reset();
        setSelectedDepartmentId("");
        setSelectedBatchId("");
        setSelectedLevelId("");
        setSelectedTermId("");
        setSelectedCategoryId("");
        setCustomCategoryName("");
        setIsPinned(false);
      } else {
        setMessageType("error");
        setMessage(result.error || "Failed to publish notice.");
      }
    } catch {
      setMessageType("error");
      setMessage("Unexpected error while publishing notice.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            messageType === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* Floating Notched Notice Title */}
      <div className="relative pt-1">
        <input
          id="notice-title"
          name="title"
          type="text"
          required
          disabled={isSubmitting || !canPublish}
          placeholder=" "
          className="peer h-11 w-full rounded-xl border border-slate-700/80 bg-slate-950/90 px-3.5 text-sm text-white placeholder-transparent transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:shadow-[0_0_20px_rgba(6,182,212,0.18)]"
        />
        <label
          htmlFor="notice-title"
          className="pointer-events-none absolute left-3.5 top-4 text-xs font-medium text-slate-400 transition-all duration-200 peer-focus:-top-1.5 peer-focus:left-3 peer-focus:bg-[#0A1020] peer-focus:px-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-cyan-400 peer-[:not(:placeholder-shown)]:-top-1.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-cyan-400"
        >
          Notice Title
        </label>
      </div>

      {/* Category & Department (2-col clean grid) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Category
          </label>
          <ModernDropdown
            name="category_id"
            value={selectedCategoryId}
            onChange={(val) => {
              setSelectedCategoryId(val);
              const cat = categories.find((c) => c.id === val);
              if (cat?.name !== "Others") setCustomCategoryName("");
            }}
            disabled={isSubmitting || !canPublish}
            placeholder="No Category"
            options={[
              { value: "", label: "No Category" },
              ...categories
                .filter((c) => c.name !== "Others")
                .map((c) => ({ value: c.id, label: c.name })),
              ...categories
                .filter((c) => c.name === "Others")
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Target Scope
          </label>
          <ModernDropdown
            name="target_department_id"
            value={selectedDepartmentId}
            onChange={handleDepartmentChange}
            disabled={isSubmitting || !canPublish}
            placeholder="All Students"
            options={[
              { value: "", label: "All Students" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      {isOthersCategory && (
        <div className="relative pt-1">
          <input
            id="notice-custom-category"
            name="custom_category_name"
            type="text"
            required
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            disabled={isSubmitting || !canPublish}
            placeholder=" "
            className="peer h-10 w-full rounded-xl border border-slate-700/80 bg-slate-950/90 px-3.5 text-xs text-white placeholder-transparent transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <label
            htmlFor="notice-custom-category"
            className="pointer-events-none absolute left-3.5 top-3.5 text-xs font-medium text-slate-400 transition-all duration-200 peer-focus:-top-1.5 peer-focus:left-3 peer-focus:bg-[#0A1020] peer-focus:px-1.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-cyan-400 peer-[:not(:placeholder-shown)]:-top-1.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-cyan-400"
          >
            Custom Category Name
          </label>
        </div>
      )}

      {/* Optional Batch / Level / Term — only shown when a specific Department is selected */}
      {hasDepartment && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Batch
            </label>
            <ModernDropdown
              name="target_batch_id"
              value={selectedBatchId}
              onChange={setSelectedBatchId}
              disabled={isSubmitting || !canPublish}
              placeholder="All Batches"
              options={[
                { value: "", label: "All Batches" },
                ...batches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Level
            </label>
            <ModernDropdown
              name="target_level_id"
              value={selectedLevelId}
              onChange={handleLevelChange}
              disabled={isSubmitting || !canPublish}
              placeholder="All Levels"
              options={[
                { value: "", label: "All Levels" },
                ...levels.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Term
            </label>
            <ModernDropdown
              name="target_term_id"
              value={selectedTermId}
              onChange={setSelectedTermId}
              disabled={isSubmitting || !canPublish || !selectedLevelId}
              placeholder={selectedLevelId ? "All Terms" : "Select a Level First"}
              options={[
                {
                  value: "",
                  label: selectedLevelId ? "All Terms" : "Select a Level First",
                },
                ...visibleTerms.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>
        </div>
      )}

      {/* Floating Notched Notice Content */}
      <div className="relative pt-1">
        <textarea
          id="notice-content"
          name="content"
          rows={3}
          required
          disabled={isSubmitting || !canPublish}
          placeholder=" "
          className="peer w-full rounded-xl border border-slate-700/80 bg-slate-950/90 px-3.5 py-3 text-sm text-white placeholder-transparent transition-all focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:shadow-[0_0_20px_rgba(6,182,212,0.18)]"
        />
        <label
          htmlFor="notice-content"
          className="pointer-events-none absolute left-3.5 top-4 text-xs font-medium text-slate-400 transition-all duration-200 peer-focus:-top-1.5 peer-focus:left-3 peer-focus:bg-[#0A1020] peer-focus:px-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-cyan-400 peer-[:not(:placeholder-shown)]:-top-1.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-[#0A1020] peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-cyan-400"
        >
          Notice Content
        </label>
      </div>

      {/* Compact Attachment + Amber Pin Toggle Row */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Paperclip className="h-4 w-4 shrink-0 text-cyan-400" />
          <input
            id="notice-attachment"
            name="attachment"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            disabled={isSubmitting || !canPublish}
            className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border file:border-cyan-500/30 file:bg-cyan-500/15 file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-cyan-300 hover:file:bg-cyan-500/25 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <input type="hidden" name="is_pinned" value={isPinned ? "on" : ""} />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
            <Pin className="h-3.5 w-3.5 text-amber-400" />
            Pin to Top
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPinned}
            onClick={() => setIsPinned(!isPinned)}
            disabled={isSubmitting || !canPublish}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              isPinned
                ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                isPinned ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Glowing Cyan Publish Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !canPublish}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:shadow-[0_0_36px_rgba(6,182,212,0.55)] transition-all cursor-pointer"
      >
        {isSubmitting ? "Publishing Notice..." : "Publish Notice"}
      </Button>
    </form>
  );
}