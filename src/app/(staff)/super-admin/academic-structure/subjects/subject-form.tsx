"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Department = {
  id: string;
  name: string;
  code: string;
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

type SubjectFormProps = {
  departments: Department[];
  levels: Level[];
  terms: Term[];
  action: (formData: FormData) => void | Promise<void>;
};

export function SubjectForm({
  departments,
  levels,
  terms,
  action,
}: SubjectFormProps) {
  const [selectedLevelId, setSelectedLevelId] = useState("");

  const filteredTerms = terms.filter(
    (term) => term.level_id === selectedLevelId,
  );

  return (
    <form
      action={action}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
    >
      {/* Department */}
      <div>
        <label
          htmlFor="department_id"
          className="mb-2 block text-sm font-medium"
        >
          Department
        </label>

        <select
          id="department_id"
          name="department_id"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select Department</option>

          {departments.map((department) => (
            <option
              key={department.id}
              value={department.id}
            >
              {department.name}
            </option>
          ))}
        </select>
      </div>

      {/* Level */}
      <div>
        <label
          htmlFor="level_id"
          className="mb-2 block text-sm font-medium"
        >
          Level
        </label>

        <select
          id="level_id"
          name="level_id"
          required
          value={selectedLevelId}
          onChange={(event) =>
            setSelectedLevelId(event.target.value)
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select Level</option>

          {levels.map((level) => (
            <option
              key={level.id}
              value={level.id}
            >
              {level.name}
            </option>
          ))}
        </select>
      </div>

      {/* Term */}
      <div>
        <label
          htmlFor="term_id"
          className="mb-2 block text-sm font-medium"
        >
          Term
        </label>

        <select
          id="term_id"
          name="term_id"
          required
          disabled={!selectedLevelId}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {selectedLevelId
              ? "Select Term"
              : "Select Level First"}
          </option>

          {filteredTerms.map((term) => (
            <option
              key={term.id}
              value={term.id}
            >
              {term.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subject Code */}
      <div>
        <label
          htmlFor="subject_code"
          className="mb-2 block text-sm font-medium"
        >
          Subject Code
        </label>

        <input
          id="subject_code"
          name="subject_code"
          type="text"
          placeholder="e.g. MS 101"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Subject Name */}
      <div>
        <label
          htmlFor="subject_name"
          className="mb-2 block text-sm font-medium"
        >
          Subject Name
        </label>

        <input
          id="subject_name"
          name="subject_name"
          type="text"
          placeholder="e.g. Mathematics-I"
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Submit */}
      <div className="md:col-span-2 lg:col-span-5">
        <Button type="submit">
          Add Subject
        </Button>
      </div>
    </form>
  );
}