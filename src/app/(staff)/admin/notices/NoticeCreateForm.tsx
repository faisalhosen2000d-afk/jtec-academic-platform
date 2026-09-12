"use client";

import { useState } from "react";
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
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          You do not currently have permission to publish notices.
          Please contact the Super Admin.
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            messageType === "success"
              ? "border-border bg-muted/40"
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
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
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
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          />
        </div>

        <div>
          <label
            htmlFor="notice-category"
            className="mb-2 block text-sm font-medium"
          >
            Category
          </label>

          <select
            id="notice-category"
            name="category_id"
            value={selectedCategoryId}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedCategoryId(value);

              const selectedCategory = categories.find(
                (category) => category.id === value,
              );

              if (selectedCategory?.name !== "Others") {
                setCustomCategoryName("");
              }
            }}
            disabled={!canPublish || isSubmitting}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            <option value="">No Category</option>

            {categories
              .filter((category) => category.name !== "Others")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}

            {categories
              .filter((category) => category.name === "Others")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>

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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
              />

              <p className="mt-1 text-xs text-muted-foreground">
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

          <select
            id="notice-department"
            name="target_department_id"
            value={selectedDepartmentId}
            onChange={(event) =>
              handleDepartmentChange(event.target.value)
            }
            disabled={!canPublish || isSubmitting}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            <option value="">All Students</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <p className="mt-1 text-xs text-muted-foreground">
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

          <select
            id="notice-batch"
            name="target_batch_id"
            value={selectedBatchId}
            onChange={(event) => setSelectedBatchId(event.target.value)}
            disabled={!canPublish || isSubmitting || !hasDepartment}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            <option value="">
              {hasDepartment ? "All Batches" : "Select a Department First"}
            </option>

            {hasDepartment &&
              batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notice-level"
            className="mb-2 block text-sm font-medium"
          >
            Level
          </label>

          <select
            id="notice-level"
            name="target_level_id"
            value={selectedLevelId}
            onChange={(event) => handleLevelChange(event.target.value)}
            disabled={!canPublish || isSubmitting || !hasDepartment}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            <option value="">
              {hasDepartment ? "All Levels" : "Select a Department First"}
            </option>

            {hasDepartment &&
              levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notice-term"
            className="mb-2 block text-sm font-medium"
          >
            Term
          </label>

          <select
            id="notice-term"
            name="target_term_id"
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
            disabled={
              !canPublish ||
              isSubmitting ||
              !hasDepartment ||
              !selectedLevelId
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted/40"
          >
            <option value="">
              {!hasDepartment
                ? "Select a Department First"
                : !selectedLevelId
                  ? "Select a Level First"
                  : "All Terms"}
            </option>

            {hasDepartment &&
              selectedLevelId &&
              visibleTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notice-attachment"
            className="mb-2 block text-sm font-medium"
          >
            Attachment
            <span className="ml-1 font-normal text-muted-foreground">
              (Optional)
            </span>
          </label>

          <input
            id="notice-attachment"
            name="attachment"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            disabled={!canPublish || isSubmitting}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:bg-muted/40"
          />

          <p className="mt-1 text-xs text-muted-foreground">
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
        <Button
          type="submit"
          disabled={!canPublish || isSubmitting}
        >
          {isSubmitting ? "Publishing..." : "Publish Notice"}
        </Button>
      </div>
    </form>
  );
}
