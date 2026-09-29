"use client";

import { useCallback, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Platform check without a hydration mismatch (server assumes Mac). */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );
}

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "dc-theme";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Theme preference persisted in localStorage and applied to <html>. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readTheme,
    () => "light" as Theme,
  );
  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable */
    }
    applyTheme(next);
    listeners.forEach((l) => l());
  }, []);
  return [theme, setTheme];
}

const prefListeners = new Set<() => void>();
/** Session copy so the choice still applies where storage is blocked. */
const prefMemory = new Map<string, string>();

/**
 * A per-browser UI preference (a remembered view or tab) from a fixed set of
 * values. Renders `fallback` on the server and until storage is readable.
 */
export function useLocalPreference<T extends string>(key: string, values: readonly T[], fallback: T): [T, (next: T) => void] {
  const read = useCallback(() => {
    let v = prefMemory.get(key) ?? null;
    try {
      v = localStorage.getItem(key) ?? v;
    } catch {
      /* storage unavailable */
    }
    return v && (values as readonly string[]).includes(v) ? (v as T) : fallback;
  }, [key, values, fallback]);
  const value = useSyncExternalStore(
    (cb) => {
      prefListeners.add(cb);
      return () => prefListeners.delete(cb);
    },
    read,
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      prefMemory.set(key, next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable */
      }
      prefListeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}

const minuteListeners = new Set<() => void>();
let minuteTimer: ReturnType<typeof setInterval> | undefined;

/** Current minute (epoch minutes), ticking once a minute; null during SSR. */
export function useNowMinute(): number | null {
  return useSyncExternalStore(
    (cb) => {
      minuteListeners.add(cb);
      if (!minuteTimer) minuteTimer = setInterval(() => minuteListeners.forEach((l) => l()), 30_000);
      return () => {
        minuteListeners.delete(cb);
        if (minuteListeners.size === 0 && minuteTimer) {
          clearInterval(minuteTimer);
          minuteTimer = undefined;
        }
      };
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}
