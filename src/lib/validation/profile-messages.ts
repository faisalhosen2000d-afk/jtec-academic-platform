import { z } from "zod";

export const profileMessageSchema = z.object({
  recipient_id: z.string().uuid("Invalid recipient."),
  material_id: z.string().uuid("Invalid material reference.").nullable().optional(),
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message is too long."),
});

export type ProfileMessageInput = z.infer<typeof profileMessageSchema>;
