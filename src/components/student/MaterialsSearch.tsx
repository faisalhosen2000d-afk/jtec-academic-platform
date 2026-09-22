"use client";

import { useMemo, useState } from "react";
import MaterialCard from "@/components/student/MaterialCard";

type MaterialSearchItem = {
  id: string;
  subject_id: string;
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
    level_id: string;
    term_id: string;
  } | null;
};

type MaterialSearchSubject = {
  id: string;
  subject_code: string;
  subject_name: string;
  level_id: string;
  term_id: string;
};

type MaterialsSearchProps = {
  subjects: MaterialSearchSubject[];
  materials: MaterialSearchItem[];
};

export default function MaterialsSearch({
  subjects,
  materials,
}: MaterialsSearchProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMaterials = useMemo(() => {
    const normalizeText = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    const normalizedQuery = normalizeText(searchQuery);
    const queryWords = normalizedQuery
      ? normalizedQuery.split(" ").filter(Boolean)
      : [];

    const selectedSubject = subjects.find(
      (subject) => subject.id === selectedSubjectId,
    );

    const subjectFiltered =
      selectedSubjectId === "all" || !selectedSubject
        ? materials
        : materials.filter((material) => {
            const materialSubject = material.subject;

            return (
              materialSubject != null &&
              materialSubject.subject_code === selectedSubject.subject_code &&
              materialSubject.level_id === selectedSubject.level_id &&
              materialSubject.term_id === selectedSubject.term_id
            );
          });


    if (!normalizedQuery) {
      return subjectFiltered;
    }

    const containsAllWords = (value: string) =>
      queryWords.every((word) => value.includes(word));

    return subjectFiltered
      .map((material) => {
        const title = normalizeText(material.title);
        const topic = normalizeText(material.topic ?? "");
        const description = normalizeText(material.description ?? "");
        const subjectCode = normalizeText(
          material.subject?.subject_code ?? "",
        );
        const subjectName = normalizeText(
          material.subject?.subject_name ?? "",
        );

        let score = 0;

        if (title === normalizedQuery) {
          score = 100;
        } else if (title.includes(normalizedQuery)) {
          score = 90;
        } else if (containsAllWords(title)) {
          score = 80;
        } else if (topic === normalizedQuery) {
          score = 70;
        } else if (topic.includes(normalizedQuery)) {
          score = 60;
        } else if (containsAllWords(topic)) {
          score = 55;
        } else if (containsAllWords(description)) {
          score = 40;
        } else if (
          subjectCode.includes(normalizedQuery) ||
          subjectName.includes(normalizedQuery)
        ) {
          score = 30;
        }

        return {
          material,
          score,
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          new Date(b.material.created_at).getTime() -
          new Date(a.material.created_at).getTime()
        );
      })
      .map((result) => result.material);
  }, [materials, searchQuery, selectedSubjectId, subjects]);

  return (
    <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <label
            htmlFor="material-search"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Search Materials
          </label>

          <input
            id="material-search"
            type="search"
            placeholder="Search by title, topic, description..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="material-subject"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Category / Subject
          </label>

          <select
            id="material-subject"
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
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {filteredMaterials.length}{" "}
          {filteredMaterials.length === 1 ? "material" : "materials"} found
        </p>
      </div>

      {filteredMaterials.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-foreground">
            No materials found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery.trim()
              ? "No approved materials match your search in the selected subject."
              : "No approved materials are available for the selected subject right now."}
          </p>
        </div>
      )}
    </section>
  );
}





