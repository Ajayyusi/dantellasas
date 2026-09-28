import type { Vars } from "@/lib/i18n/define";
import type { TKey } from "@/lib/i18n/messages";
import { SYSTEM_ROLE_KEYS, type SystemRoleKey } from "@/lib/permissions";
import type { RoleDTO } from "@/lib/types";

type T = (key: TKey, vars?: Vars) => string;

function isSystemKey(key: string): key is SystemRoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key);
}

/** Built-in roles use the translated description; custom roles show their own. */
export function roleDescription(role: Pick<RoleDTO, "key" | "system" | "description">, t: T): string {
  if (role.system && isSystemKey(role.key)) return t(`settings.roleNames.${role.key}.description`);
  return role.description;
}
