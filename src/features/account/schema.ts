import { z } from "zod";

export const displayNameInput = z.object({
  displayName: z.string().trim().min(1, "validation.required").max(80, "validation.tooLong"),
});
export type DisplayNameInput = z.input<typeof displayNameInput>;

export const passwordInput = z
  .object({
    current: z.string().min(1, "validation.required"),
    next: z.string().min(8, "validation.password").max(128, "validation.tooLong"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "validation.passwordMatch" });
