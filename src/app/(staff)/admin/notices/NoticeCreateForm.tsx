"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { publishNotice } from "@/server/actions/notices";
import { Button } from "@/components/ui/button";

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
              : "cursor-pointer border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "error",
  );

  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");

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

    const result = await publishNotice(formData);

    if (result.success) {
      setMessageType("success");
      setMessage("Notice published successfully.");

      const form = document.getElementById(
        "notice-create-form",
      ) as HTMLFormElement | null;

      form?.reset();

      setSelectedDepartmentId("");
      setSelectedBatchId("");
      setSelectedLevelId("");
      setSelectedTermId("");
      setSelectedCategoryId("");
      setCustomCategoryName("");
    } else {
      setMessageType("error");
      setMessage(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <form
      id="notice-create-form"
      action={handleSubmit}
      className="space-y-6"
    >
      {!canPublish && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          You do not currently have permission to publish notices.
          Please contact the Super Admin.
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            messageType === "success"
              ? "border-slate-800 bg-slate-900/40"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="notice-title"
            className="mb-2 block text-sm font-medium"
          >
            Notice Title
          </label>

          <input
            id="notice-title"
            name="title"
            type="text"
            maxLength={300}
            required
            disabled={!canPublish || isSubmitting}
            placeholder="Enter notice title"
            className="w-full rounded-md border border-input bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-900/40"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notice-content"
            className="mb-2 block text-sm font-medium"
          >
            Notice Content
          </label>

          <textarea
            id="notice-content"
            name="content"
            rows={7}
            maxLength={20000}
            required
            disabled={!canPublish || isSubmitting}
            placeholder="Write the notice content..."
            className="w-full rounded-md border border-input bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-900/40"
          />
        </div>

        <div>
          <label
            htmlFor="notice-category"
            className="mb-2 block text-sm font-medium"
          >
            Category
          </label>

          <ModernDropdown name="category_id" value={selectedCategoryId} onChange={(val) => { setSelectedCategoryId(val); if (val !== "other") { setCustomCategoryName(""); } }} disabled={isSubmitting || !canPublish} placeholder="No Category" options={[{ value: "", label: "No Category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />

          {isOthersCategory && (
            <div className="mt-3">
              <label
                htmlFor="custom-category-name"
                className="mb-2 block text-sm font-medium"
              >
                Custom Category
              </label>

              <input
                id="custom-category-name"
                name="custom_category"
                type="text"
                value={customCategoryName}
                onChange={(event) =>
                  setCustomCategoryName(event.target.value)
                }
                maxLength={100}
                required
                disabled={!canPublish || isSubmitting}
                placeholder="Enter custom category name"
                className="w-full rounded-md border border-input bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-900/40"
              />

              <p className="mt-1 text-xs text-slate-400">
                This category will be saved for future notices.
              </p>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="notice-department"
            className="mb-2 block text-sm font-medium"
          >
            Department
          </label>

          <ModernDropdown name="target_department_id" value={selectedDepartmentId} onChange={handleDepartmentChange} disabled={isSubmitting || !canPublish} placeholder="All Students" options={[{ value: "", label: "All Students" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />

          <p className="mt-1 text-xs text-slate-400">
            Select All Students for a college-wide notice, or choose a
            department for optional batch, level, and term targeting.
          </p>
        </div>

        <div>
          <label
            htmlFor="notice-batch"
            className="mb-2 block text-sm font-medium"
          >
            Batch
          </label>

          <ModernDropdown name="target_batch_id" value={selectedBatchId} onChange={setSelectedBatchId} disabled={!canPublish || isSubmitting || !hasDepartment} placeholder={hasDepartment ? "All Batches" : "Select a Department First"} options={[{ value: "", label: hasDepartment ? "All Batches" : "Select a Department First" }, ...(hasDepartment ? batches.map((b) => ({ value: b.id, label: b.name })) : [])]} />
        </div>

        <div>
          <label
            htmlFor="notice-level"
            className="mb-2 block text-sm font-medium"
          >
            Level
          </label>

          <ModernDropdown name="target_level_id" value={selectedLevelId} onChange={handleLevelChange} disabled={!canPublish || isSubmitting || !hasDepartment} placeholder={hasDepartment ? "All Levels" : "Select a Department First"} options={[{ value: "", label: hasDepartment ? "All Levels" : "Select a Department First" }, ...(hasDepartment ? levels.map((l) => ({ value: l.id, label: l.name })) : [])]} />
        </div>

        <div>
          <label
            htmlFor="notice-term"
            className="mb-2 block text-sm font-medium"
          >
            Term
          </label>

          <ModernDropdown name="target_term_id" value={selectedTermId} onChange={setSelectedTermId} disabled={!canPublish || isSubmitting || !hasDepartment || !selectedLevelId} placeholder={!hasDepartment ? "Select a Department First" : !selectedLevelId ? "Select a Level First" : "All Terms"} options={[{ value: "", label: !hasDepartment ? "Select a Department First" : !selectedLevelId ? "Select a Level First" : "All Terms" }, ...(hasDepartment && selectedLevelId ? terms.filter((t) => t.level_id === selectedLevelId).map((t) => ({ value: t.id, label: t.name })) : [])]} />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notice-attachment"
            className="mb-2 block text-sm font-medium"
          >
            Attachment
            <span className="ml-1 font-normal text-slate-400">
              (Optional)
            </span>
          </label>

          <input
            id="notice-attachment"
            name="attachment"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            disabled={!canPublish || isSubmitting}
            className="w-full rounded-md border border-input bg-slate-950 px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border file:border-cyan-500/30 file:bg-cyan-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-300 hover:file:bg-cyan-500/25 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:bg-slate-900/40"
          />

          <p className="mt-1 text-xs text-slate-400">
            PDF, JPG, JPEG, PNG, DOC, or DOCX. Maximum file size: 100 MB.
          </p>
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <input
            id="notice-pinned"
            name="is_pinned"
            type="checkbox"
            disabled={!canPublish || isSubmitting}
            className="h-4 w-4 rounded border-input"
          />

          <label
            htmlFor="notice-pinned"
            className="text-sm font-medium"
          >
            Pin this notice
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting || !canPublish} className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all cursor-pointer">
          {isSubmitting ? "Publishing..." : "Publish Notice"}
        </Button>
      </div>
    </form>
  );
}
