"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  deleteStudentAccount,
  type UserActionResult,
} from "@/app/(staff)/super-admin/users/actions";

type DeleteStudentButtonProps = {
  studentId: string;
  studentName: string;
};

export default function DeleteStudentButton({
  studentId,
  studentName,
}: DeleteStudentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UserActionResult | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${studentName}"?\n\n` +
        "This will permanently remove the student account and related data. " +
        "This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setResult(null);

    startTransition(async () => {
      const response = await deleteStudentAccount(studentId);
      setResult(response);

      if (response.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        className="bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Delete"}
      </Button>

      {result && !result.success && (
        <p className="max-w-48 text-xs text-destructive">{result.error}</p>
      )}
    </div>
  );
}





