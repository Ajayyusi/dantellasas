import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),
  SESSION_COOKIE_MAX_AGE_DAYS: z.coerce.number().min(1).max(14).default(5),
  ALLOW_DEMO_DATA: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables. See .env.example.\n${z.prettifyError(parsed.error)}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Firebase requires `__session` for cookies forwarded through its CDN. */
export const SESSION_COOKIE = "__session";
