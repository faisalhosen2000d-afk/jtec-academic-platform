"use client";

import { useState } from "react";
import DeleteStudentButton from "./DeleteStudentButton";
import BulkDeleteStudentsButton from "./BulkDeleteStudentsButton";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  is_verified: boolean;
  upload_disabled: boolean;
  created_at: string;
};

type StudentAccountsTableProps = {
  students: StudentProfile[];
};

export default function StudentAccountsTable({
  students,
}: StudentAccountsTableProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const allSelected =
    students.length > 0 && selectedStudentIds.length === students.length;

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleAll() {
    setSelectedStudentIds(allSelected ? [] : students.map((student) => student.id));
  }

  function clearSelection() {
    setSelectedStudentIds([]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/20 px-5 py-3">
        <p className="text-sm text-muted-foreground">
          {selectedStudentIds.length > 0
            ? `${selectedStudentIds.length} student selected`
            : "Select students to perform bulk actions"}
        </p>

        <BulkDeleteStudentsButton
          selectedStudentIds={selectedStudentIds}
          onDeleted={clearSelection}
        />
      </div>

      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-5 py-3 font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all students"
                className="h-4 w-4 rounded border-border"
              />
            </th>
            <th className="px-5 py-3 font-semibold">Student</th>
            <th className="px-5 py-3 font-semibold">Student ID</th>
            <th className="px-5 py-3 font-semibold">Email</th>
            <th className="px-5 py-3 font-semibold">Verification</th>
            <th className="px-5 py-3 font-semibold">Upload Permission</th>
            <th className="px-5 py-3 font-semibold">Created</th>
            <th className="px-5 py-3 font-semibold">Action</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-5 py-4">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  aria-label={`Select ${student.full_name}`}
                  className="h-4 w-4 rounded border-border"
                />
              </td>

              <td className="px-5 py-4">
                <div className="font-medium">{student.full_name}</div>
              </td>

              <td className="px-5 py-4">{student.student_id ?? "—"}</td>

              <td className="px-5 py-4">{student.email}</td>

              <td className="px-5 py-4">
                <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                  {student.is_verified ? "Verified" : "Pending"}
                </span>
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                  {student.upload_disabled ? "Disabled" : "Enabled"}
                </span>
              </td>

              <td className="px-5 py-4 text-muted-foreground">
                {new Date(student.created_at).toLocaleDateString("en-GB")}
              </td>

              <td className="px-5 py-4">
                <DeleteStudentButton
                  studentId={student.id}
                  studentName={student.full_name}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
