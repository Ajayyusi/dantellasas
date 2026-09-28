import type { LeafPaths } from "../define";

import { auth } from "./auth";
import { common } from "./common";

/**
 * All message modules. Add a module here after creating it with
 * `defineMessages` in this folder.
 */
export const messages = {
  en: { ...common.en, ...auth.en },
  ar: { ...common.ar, ...auth.ar },
};

export type Messages = typeof messages.en;
export type TKey = LeafPaths<Messages>;
