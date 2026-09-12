"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SubjectItemProps = {
  subject: {
    id: string;
    department_id: string;
    level_id: string;
    term_id: string;
    subject_code: string;
    subject_name: string;
  };
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function SubjectItem({
  subject,
  updateAction,
  deleteAction,
}: SubjectItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="rounded-md border border-border bg-background p-4">
        <form
          action={async (formData) => {
            await updateAction(formData);
            setIsEditing(false);
          }}
          className="space-y-4"
        >
          <input
            type="hidden"
            name="id"
            value={subject.id}
          />

          <input
            type="hidden"
            name="department_id"
            value={subject.department_id}
          />

          <input
            type="hidden"
            name="level_id"
            value={subject.level_id}
          />

          <input
            type="hidden"
            name="term_id"
            value={subject.term_id}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor={`edit-code-${subject.id}`}
                className="mb-2 block text-xs font-medium text-muted-foreground"
              >
                Subject Code
              </label>

              <input
                id={`edit-code-${subject.id}`}
                name="subject_code"
                type="text"
                defaultValue={subject.subject_code}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor={`edit-name-${subject.id}`}
                className="mb-2 block text-xs font-medium text-muted-foreground"
              >
                Subject Name
              </label>

              <input
                id={`edit-name-${subject.id}`}
                name="subject_name"
                type="text"
                defaultValue={subject.subject_name}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              Save Changes
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {subject.subject_code}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {subject.subject_name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>

          <form action={deleteAction}>
            <input
              type="hidden"
              name="id"
              value={subject.id}
            />

            <Button
              type="submit"
              variant="outline"
            >
              Delete Subject
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}