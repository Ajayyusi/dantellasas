import { describe, expect, it } from "vitest";

import { adminAccess, isAdminEmail, parseAdminEmails } from "../../src/lib/platform/admins";

describe("parseAdminEmails", () => {
  it("splits, trims, lower-cases and de-duplicates", () => {
    expect(parseAdminEmails(" Owner@Example.com, ops@example.com;owner@example.com  team@example.org ")).toEqual([
      "owner@example.com",
      "ops@example.com",
      "team@example.org",
    ]);
  });

  it("is empty (no admins) when unset or malformed", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("not-an-email, @x.com, a@b")).toEqual([]);
  });
});

describe("adminAccess", () => {
  const admins = parseAdminEmails("owner@example.com");

  it("grants a listed, verified, enabled account", () => {
    expect(adminAccess({ email: "Owner@example.com", emailVerified: true, disabled: false }, admins)).toBe("granted");
  });

  it("asks a listed account to verify its email first", () => {
    expect(adminAccess({ email: "owner@example.com", emailVerified: false, disabled: false }, admins)).toBe("unverified");
  });

  it("denies everyone else, disabled accounts and accounts without an email", () => {
    expect(adminAccess({ email: "someone@example.com", emailVerified: true, disabled: false }, admins)).toBe("denied");
    expect(adminAccess({ email: "owner@example.com", emailVerified: true, disabled: true }, admins)).toBe("denied");
    expect(adminAccess({ email: null, emailVerified: true, disabled: false }, admins)).toBe("denied");
    expect(adminAccess({ email: "owner@example.com", emailVerified: true, disabled: false }, [])).toBe("denied");
  });

  it("matches whole addresses only", () => {
    expect(isAdminEmail("xowner@example.com", admins)).toBe(false);
    expect(isAdminEmail("owner@example.com.evil.com", admins)).toBe(false);
  });
});
