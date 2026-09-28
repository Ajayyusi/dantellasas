/**
 * Human labels for audit action keys ("appointment.created" → "Appointment
 * created"), translated where the entity/verb is known and humanised otherwise.
 */
type Te = (key: string, vars?: Record<string, string | number>) => string;

/** "giftCard" / "gift-card" → "gift_card" (translation keys are snake_case). */
function snake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function humanize(s: string): string {
  const words = snake(s).replace(/_+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : s;
}

function known(te: Te, key: string): string | null {
  const v = te(key);
  return v === key ? null : v;
}

export function auditEntityLabel(entity: string, te: Te): string {
  return known(te, `settings.audit.entities.${snake(entity)}`) ?? humanize(entity);
}

export function auditActionLabel(action: string, te: Te): string {
  const dot = action.indexOf(".");
  if (dot < 0) return humanize(action);
  const entity = action.slice(0, dot);
  const verb = action.slice(dot + 1);
  const verbLabel = known(te, `settings.audit.verbs.${snake(verb)}`) ?? humanize(verb).toLowerCase();
  return te("settings.audit.label", { entity: auditEntityLabel(entity, te), verb: verbLabel });
}

/** The area an action belongs to (its entity prefix), used as a filter facet. */
export function auditGroup(action: string): string {
  const dot = action.indexOf(".");
  return dot < 0 ? action : action.slice(0, dot);
}
