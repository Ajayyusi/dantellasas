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
    return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
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
    () => "system" as Theme,
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
