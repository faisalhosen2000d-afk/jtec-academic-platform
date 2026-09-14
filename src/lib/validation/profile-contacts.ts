import { z } from "zod";

export const profileContactsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .or(z.literal(""))
    .default(""),
  phone: z.string().trim().max(50, "Phone number is too long.").default(""),
  whatsapp: z.string().trim().max(100, "WhatsApp value is too long.").default(""),
  facebook: z.string().trim().max(255, "Facebook link is too long.").default(""),
  instagram: z.string().trim().max(255, "Instagram link is too long.").default(""),
  linkedin: z.string().trim().max(255, "LinkedIn link is too long.").default(""),
});

export type ProfileContactsInput = z.infer<typeof profileContactsSchema>;
