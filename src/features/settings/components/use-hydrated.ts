"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR and hydration, true afterwards. Used to render drag handles
 * only on the client: dnd-kit's DndContext numbers its aria ids with a global
 * counter that differs between server and client (hydration mismatch).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
