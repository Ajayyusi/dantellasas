/**
 * Platform admins run Dantella itself (every salon), as opposed to a salon's
 * own owners and admins. They are listed by email in `PLATFORM_ADMIN_EMAILS`
 * (a Secret Manager secret in production, so the addresses stay out of the
 * repository) and their Firebase account must have a verified email.
 */

export type AdminAccess = "granted" | "unverified" | "denied";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "a@x.com, B@y.com" → ["a@x.com", "b@y.com"]; commas, semicolons or spaces separate. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  const emails = (raw ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
  return [...new Set(emails)];
}

export function isAdminEmail(email: string | null | undefined, admins: readonly string[]): boolean {
  const e = email?.trim().toLowerCase();
  return !!e && admins.includes(e);
}

/** Access for a Firebase account: listed and verified, listed but unverified, or not an admin. */
export function adminAccess(
  account: { email?: string | null; emailVerified: boolean; disabled: boolean },
  admins: readonly string[],
): AdminAccess {
  if (account.disabled || !isAdminEmail(account.email, admins)) return "denied";
  return account.emailVerified ? "granted" : "unverified";
}
