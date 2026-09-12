# Server Actions

Form-driven mutations (upload, rate, comment, bookmark, report, etc.),
grouped by domain. Each action validates input (Zod), checks permission,
then calls the matching service in `src/server/services/`.
