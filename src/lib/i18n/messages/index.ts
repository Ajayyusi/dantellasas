import type { LeafPaths } from "../define";

import { appointments } from "./appointments";
import { auth } from "./auth";
import { catalog } from "./catalog";
import { clients } from "./clients";
import { common } from "./common";
import { expenses } from "./expenses";
import { inventory } from "./inventory";
import { sales } from "./sales";
import { services } from "./services";
import { settings } from "./settings";
import { staff } from "./staff";

/**
 * All message modules. Add a module here after creating it with
 * `defineMessages` in this folder.
 */
export const messages = {
  en: { ...sales.en, ...appointments.en, ...common.en, ...auth.en, ...services.en, ...clients.en, ...settings.en, ...expenses.en, ...inventory.en, ...catalog.en, ...staff.en },
  ar: { ...sales.ar, ...appointments.ar, ...common.ar, ...auth.ar, ...services.ar, ...clients.ar, ...settings.ar, ...expenses.ar, ...inventory.ar, ...catalog.ar, ...staff.ar },
};

export type Messages = typeof messages.en;
export type TKey = LeafPaths<Messages>;
