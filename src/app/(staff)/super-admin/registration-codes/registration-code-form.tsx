"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
  action: (formData: FormData) => void | Promise<void>;
};

export function RegistrationCodeForm({
  departments,
  batches,
  levels,
  terms,
  action,
}: RegistrationCodeFormProps) {
  const [selectedLevelId, setSelectedLevelId] = useState("");

  const filteredTerms = terms
    .filter((term) => term.level_id === selectedLevelId)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <form
      action={action}
      className="space-y-6 rounded-xl border border-border bg-card p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Create Registration Code
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Create a student registration code and bind it to the student&apos;s
          academic assignment.
        </p>
      </div>

      {/* Automatic Code Information */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-foreground">
          Registration Code
        </p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          The system will automatically generate a unique registration code
          when you submit this form. You do not need to enter a code manually.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Student ID */}
        <div>
          <label
            htmlFor="student_id"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Student ID
          </label>

          <input
            id="student_id"
            name="student_id"
            type="text"
            placeholder="e.g. 24060401021"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Department */}
        <div>
          <label
            htmlFor="department_id"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Department
          </label>

          <select
            id="department_id"
            name="department_id"
            required
            defaultValue=""
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Department</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        {/* Batch */}
        <div>
          <label
            htmlFor="batch_id"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Batch
          </label>

          <select
            id="batch_id"
            name="batch_id"
            required
            defaultValue=""
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Batch</option>

            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level */}
        <div>
          <label
            htmlFor="level_id"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Level
          </label>

          <select
            id="level_id"
            name="level_id"
            required
            value={selectedLevelId}
            onChange={(event) => setSelectedLevelId(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select Level</option>

            {levels
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
          </select>
        </div>

        {/* Term */}
        <div>
          <label
            htmlFor="term_id"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Term
          </label>

          <select
            id="term_id"
            name="term_id"
            required
            disabled={!selectedLevelId}
            defaultValue=""
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {selectedLevelId ? "Select Term" : "Select Level First"}
            </option>

            {filteredTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </div>

        {/* Maximum Uses */}
        <div>
          <label
            htmlFor="max_uses"
            className="mb-2 block text-sm font-medium text-foreground"
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Usually 1 for one student.
          </p>
        </div>

        {/* Expiry */}
        <div>
          <label
            htmlFor="expires_at"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Expiry Date &amp; Time
          </label>

          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <p className="mt-1 text-xs text-muted-foreground">
            Leave empty for no expiry.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Generate Registration Code
        </Button>
      </div>
    </form>
  );
}