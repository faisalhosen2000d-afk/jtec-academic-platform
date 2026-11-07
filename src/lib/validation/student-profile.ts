import { z } from "zod";

export const studentFullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name cannot be empty.")
  .max(120, "Full name cannot exceed 120 characters.");

export type StudentFullNameInput = z.infer<
  typeof studentFullNameSchema
>;
