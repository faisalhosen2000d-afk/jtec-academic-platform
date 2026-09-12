"use client";

import { useRef, useState } from "react";
import { deleteNoticeForm } from "@/server/actions/notices";
import { Button } from "@/components/ui/button";

type DeleteNoticeButtonProps = {
  noticeId: string;
  noticeTitle: string;
};

export function DeleteNoticeButton({ noticeId, noticeTitle }: DeleteNoticeButtonProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={deleteNoticeForm}>
        <input type="hidden" name="notice_id" value={noticeId} />
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Delete
        </Button>
      </form>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <span className="text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Permanently delete notice?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              You are about to permanently delete
              <span className="font-semibold text-gray-900"> &quot;{noticeTitle}&quot;</span>.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => formRef.current?.requestSubmit()}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

