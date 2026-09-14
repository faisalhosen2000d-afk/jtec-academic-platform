import { z } from "zod";

export const profileMessageSchema = z.object({
  recipient_id: z.string().uuid("Invalid recipient."),
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message is too long."),
});

export type ProfileMessageInput = z.infer<typeof profileMessageSchema>;
