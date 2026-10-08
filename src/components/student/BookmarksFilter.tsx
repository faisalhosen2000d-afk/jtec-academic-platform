"use client";

import { useMemo, useState } from "react";
import MaterialCard from "@/components/student/MaterialCard";

type BookmarkFilterSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
};

type BookmarkFilterMaterial = {
  id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  file_type: string;
  file_size_bytes: number;
  views_count: number;
  downloads_count: number;
  created_at: string;
  uploader: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    telegram: string | null;
  } | null;
  subject: {
    subject_code: string;
    subject_name: string;
  } | null;
};

type BookmarksFilterProps = {
  subjects: BookmarkFilterSubject[];
  materials: BookmarkFilterMaterial[];
};

export default function BookmarksFilter({
  subjects,
  materials,
}: BookmarksFilterProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");

  const filteredMaterials = useMemo(() => {
    const selectedSubject = subjects.find(
      (subject) => subject.id === selectedSubjectId,
    );

    if (selectedSubjectId === "all" || !selectedSubject) {
      return materials;
    }

    return materials.filter((material) => {
      const materialSubject = material.subject;

      return (
        materialSubject != null &&
        materialSubject.subject_code === selectedSubject.subject_code
      );
    });
  }, [materials, selectedSubjectId, subjects]);

  return (
    <>
      <div className="mb-4 rounded-xl border border-border bg-background p-5 shadow-sm">
        <label
          htmlFor="bookmark-subject"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Category / Subject
        </label>

        <select
          id="bookmark-subject"
          value={selectedSubjectId}
          onChange={(event) => setSelectedSubjectId(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Subjects</option>

          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.subject_code} - {subject.subject_name}
            </option>
          ))}
        </select>

        <p className="mt-3 text-sm text-muted-foreground">
          {filteredMaterials.length}{" "}
          {filteredMaterials.length === 1 ? "material" : "materials"} saved
        </p>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              initialBookmarked={true}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-foreground">
            No bookmarks for this subject
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try selecting another subject or choose All Subjects.
          </p>
        </div>
      )}
    </>
  );
}