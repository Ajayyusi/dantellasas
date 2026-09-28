import "server-only";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { Permission } from "@/lib/permissions";
import { can, resolveContext, type AppContext } from "@/lib/tenancy/context";

/**
 * Every Server Action is built with `action()`: it resolves the tenant
 * context, checks the permission, validates input with Zod, runs the
 * handler, revalidates, and maps failures to translation keys the client
 * can show. Handlers throw `ActionError` for expected failures.
 */

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; vars?: Record<string, string | number> };

export class ActionError extends Error {
  constructor(
    public readonly code: string,
    public readonly fieldErrors?: Record<string, string>,
    public readonly vars?: Record<string, string | number>,
  ) {
    super(code);
    this.name = "ActionError";
  }
}

export function fail(
  code: string,
  fieldErrors?: Record<string, string>,
  vars?: Record<string, string | number>,
): never {
  throw new ActionError(code, fieldErrors, vars);
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

interface ActionConfig<S extends z.ZodType> {
  schema: S;
  /** All listed permissions are required. Omit only for self-service actions. */
  permission?: Permission | Permission[];
  /** Set false for read-only actions (searches) that must not re-render. */
  revalidate?: boolean;
}

export function action<S extends z.ZodType, R>(
  config: ActionConfig<S>,
  handler: (input: z.output<S>, ctx: AppContext) => Promise<R>,
): (input: z.input<S>) => Promise<ActionResult<R>> {
  return async (input) => {
    const res = await resolveContext();
    if (!res.ok) return { ok: false, error: `errors.${res.reason}` };
    const ctx = res.ctx;
    if (config.permission && !can(ctx, config.permission)) {
      return { ok: false, error: "errors.forbidden" };
    }
    const parsed = config.schema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "errors.validation", fieldErrors: fieldErrorsOf(parsed.error) };
    }
    try {
      const data = await handler(parsed.data, ctx);
      if (config.revalidate !== false) revalidatePath("/", "layout");
      return { ok: true, data };
    } catch (err) {
      unstable_rethrow(err);
      if (err instanceof ActionError) {
        return { ok: false, error: err.code, fieldErrors: err.fieldErrors, vars: err.vars };
      }
      console.error("[action] unexpected error", err);
      return { ok: false, error: "errors.generic" };
    }
  };
}
