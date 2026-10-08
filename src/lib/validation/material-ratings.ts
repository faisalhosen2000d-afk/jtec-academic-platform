import { z } from "zod";

export const materialRatingSchema = z.object({
  material_id: z.string().uuid("Invalid material."),
  stars: z.number().int().min(1, "Rating must be at least 1 star.").max(5, "Rating cannot exceed 5 stars."),
});

export type MaterialRatingInput = z.infer<typeof materialRatingSchema>;
