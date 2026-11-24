"use client";

import { useEffect, useState } from "react";
import { BookOpen, Calendar, ClipboardList } from "lucide-react";
import MaterialsSearch from "@/components/student/MaterialsSearch";
import QuestionBankSection, {
  type QuestionBankItem,
  type QuestionSubjectOption,
  type QuestionTermOption,
} from "@/components/student/QuestionBankSection";

type MaterialsVaultClientProps = {
  subjects: QuestionSubjectOption[];
  materials: Parameters<typeof MaterialsSearch>[0]["materials"];
  bookmarkedMaterialIds: string[];
  terms: QuestionTermOption[];
  currentTermId: string;
  questionItems: QuestionBankItem[];
  takenQuestionSlots: Parameters<typeof QuestionBankSection>[0]["takenSlots"];
};

type VaultTab = "notes" | "previous_year" | "ct";

export default function MaterialsVaultClient({
  subjects,
  materials,
  bookmarkedMaterialIds,
  terms,
  currentTermId,
  questionItems,
  takenQuestionSlots,
}: MaterialsVaultClientProps) {
  const [activeTab, setActiveTab] = useState<VaultTab>("notes");
  const [highlightQuestionId, setHighlightQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const qId = params.get("q");
    if (tab === "ct" || tab === "previous_year") {
      setActiveTab(tab);
    }
    if (qId) {
      setHighlightQuestionId(qId);
    }
  }, []);

  const pyqCount = questionItems.filter((q) => q.question_type === "previous_year").length;
  const ctCount = questionItems.filter((q) => q.question_type === "ct").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
            activeTab === "notes"
              ? "border-emerald-400/70 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.12)]"
              : "border-slate-800/90 bg-[#0A1020] hover:border-slate-700"
          }`}
        >
          <div
            className={`rounded-xl p-2.5 ${
              activeTab === "notes" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-900 text-slate-400"
            }`}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">Study Notes &amp; Books</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                {materials.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              Slides, PDFs, Lab Sheets &amp; Reference Books
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("previous_year")}
          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
            activeTab === "previous_year"
              ? "border-violet-400/70 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.12)]"
              : "border-slate-800/90 bg-[#0A1020] hover:border-slate-700"
          }`}
        >
          <div
            className={`rounded-xl p-2.5 ${
              activeTab === "previous_year" ? "bg-violet-500/20 text-violet-300" : "bg-slate-900 text-slate-400"
            }`}
          >
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">Previous Year Questions</span>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                {pyqCount}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              Year-wise Final Exam Papers by Subject
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ct")}
          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
            activeTab === "ct"
              ? "border-amber-400/70 bg-amber-500/15 shadow-[0_0_24px_rgba(245,158,11,0.12)]"
              : "border-slate-800/90 bg-[#0A1020] hover:border-slate-700"
          }`}
        >
          <div
            className={`rounded-xl p-2.5 ${
              activeTab === "ct" ? "bg-amber-500/20 text-amber-300" : "bg-slate-900 text-slate-400"
            }`}
          >
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">CT Questions</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {ctCount}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              CT-1, CT-2 &amp; CT-3 Class Test Papers
            </p>
          </div>
        </button>
      </div>

      {activeTab === "notes" ? (
        <MaterialsSearch
          subjects={subjects}
          materials={materials}
          bookmarkedMaterialIds={bookmarkedMaterialIds}
          terms={terms}
          currentTermId={currentTermId}
        />
      ) : (
        <QuestionBankSection
          mode={activeTab}
          items={questionItems}
          takenSlots={takenQuestionSlots}
          highlightQuestionId={highlightQuestionId}
          subjects={subjects}
          terms={terms}
          currentTermId={currentTermId}
        />
      )}
    </div>
  );
}