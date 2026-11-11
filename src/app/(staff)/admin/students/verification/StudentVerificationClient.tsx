"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  Eye, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Mail
} from "lucide-react";
import { approveStudentVerification, rejectStudentVerification } from "./actions";

export type PendingStudentItem = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  created_at: string;
  id_card_image_path: string | null;
  id_card_signed_url: string | null;
  matched_record?: {
    department_name: string | null;
    batch_name: string | null;
    level_name: string | null;
    term_name: string | null;
  } | null;
};

export function StudentVerificationClient({
  students,
}: {
  students: PendingStudentItem[];
}) {
  const [selectedStudent, setSelectedStudent] = useState<PendingStudentItem | null>(null);
  const [rejectingStudent, setRejectingStudent] = useState<PendingStudentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeMessage, setActiveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleApprove = (student: PendingStudentItem) => {
    setActiveMessage(null);
    startTransition(async () => {
      const res = await approveStudentVerification(student.id, student.id_card_image_path);
      if (res.success) {
        setActiveMessage({
          type: "success",
          text: `Student ${student.student_id || student.full_name} approved successfully! Academic record synchronized.`,
        });
        if (selectedStudent?.id === student.id) setSelectedStudent(null);
      } else {
        setActiveMessage({ type: "error", text: res.error || "Failed to approve student." });
      }
    });
  };

  const handleReject = () => {
    if (!rejectingStudent) return;
    setActiveMessage(null);
    startTransition(async () => {
      const res = await rejectStudentVerification(
        rejectingStudent.id,
        rejectionReason,
        rejectingStudent.id_card_image_path
      );
      if (res.success) {
        setActiveMessage({
          type: "success",
          text: `Student ${rejectingStudent.student_id || rejectingStudent.full_name} rejected.`,
        });
        setRejectingStudent(null);
        setRejectionReason("");
        if (selectedStudent?.id === rejectingStudent.id) setSelectedStudent(null);
      } else {
        setActiveMessage({ type: "error", text: res.error || "Failed to reject student." });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {activeMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            activeMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {activeMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{activeMessage.text}</span>
          </div>
          <button
            onClick={() => setActiveMessage(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        <div className="border-b border-slate-800 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>Pending Student Verifications</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review official Student ID cards and verify institutional credentials.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
            {students.length} Awaiting Review
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-white">All Caught Up!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no student accounts waiting for ID card verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Student Identity</th>
                  <th className="px-5 py-3.5 font-semibold">Student ID / Roll</th>
                  <th className="px-5 py-3.5 font-semibold">ID Card Photo</th>
                  <th className="px-5 py-3.5 font-semibold">System Academic Record</th>
                  <th className="px-5 py-3.5 font-semibold">Submitted</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{student.full_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        <span>{student.email}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-amber-400">
                      {student.student_id ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      {student.id_card_signed_url ? (
                        <div
                          onClick={() => setSelectedStudent(student)}
                          className="group/img relative w-20 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer shadow hover:border-amber-400 transition-all flex items-center justify-center"
                        >
                          <img
                            src={student.id_card_signed_url}
                            alt="ID Card Thumbnail"
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No image</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {student.matched_record ? (
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold text-slate-200">
                            {student.matched_record.department_name ?? "General"}
                          </div>
                          <div className="text-amber-400 font-mono">
                            {student.matched_record.level_name ?? "Level 1"}{" "}
                            {student.matched_record.term_name ?? "Term 1"} (Batch:{" "}
                            {student.matched_record.batch_name ?? "Default"})
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30 text-[11px] text-red-300">
                          No matching record
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(student.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {student.id_card_signed_url && (
                          <Button
                            type="button"
                            
                            
                            onClick={() => setSelectedStudent(student)}
                            className="h-8 px-2.5 rounded-lg border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>Inspect</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          
                          disabled={isPending}
                          onClick={() => handleApprove(student)}
                          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-md shadow-emerald-950/50"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          type="button"
                          
                          disabled={isPending}
                          onClick={() => {
                            setRejectingStudent(student);
                            setRejectionReason("");
                          }}
                          className="h-8 px-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULL PREVIEW MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col overflow-hidden">
            <div className="border-b border-slate-800 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Student ID Verification Review</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400 font-mono">
                    {selectedStudent.student_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify student card photo against official registration record.
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Uploaded ID Card Image
                </span>
                <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center p-2">
                  {selectedStudent.id_card_signed_url ? (
                    <img
                      src={selectedStudent.id_card_signed_url}
                      alt="Full ID Card Preview"
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Image not available</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  * Note: Photo will be automatically deleted from cloud storage upon verification.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs">
                  <span className="font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                    Institutional Verification Checklist
                  </span>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Student ID / Roll:</span>
                      <span className="font-bold text-white font-mono">
                        {selectedStudent.student_id}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Full Legal Name:</span>
                      <span className="font-bold text-white">{selectedStudent.full_name}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Account Email:</span>
                      <span className="font-semibold text-slate-200">{selectedStudent.email}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Department on Record:</span>
                      <span className="font-bold text-emerald-400">
                        {selectedStudent.matched_record?.department_name ?? "Not assigned"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Level & Term Assigned:</span>
                      <span className="font-bold text-amber-400">
                        {selectedStudent.matched_record?.level_name ?? "Level 1"}{" "}
                        {selectedStudent.matched_record?.term_name ?? "Term 1"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-blue-400">Approval Outcome:</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Approving will immediately unlock academic features (materials, results, bookmarks) for this student, attach Level/Term to their profile, and permanently purge the ID card image.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApprove(selectedStudent)}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Student</span>
                  </Button>

                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setRejectingStudent(selectedStudent);
                      setRejectionReason("");
                    }}
                    className="h-11 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 font-bold flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>Reject Verification: {rejectingStudent.student_id}</span>
              </h4>
              <button
                onClick={() => setRejectingStudent(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Reason for Rejection (Visible to Student)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. ID card photo is blurry / Name does not match student ID."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                
                onClick={() => setRejectingStudent(null)}
                className="h-10 rounded-xl border-slate-700 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleReject}
                className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg shadow-red-950/50"
              >
                {isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
