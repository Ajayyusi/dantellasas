"use client";

import { useEffect, useState } from "react";

/** Current time, ticking every `intervalMs`. Starts from the server's clock to avoid hydration drift. */
export function useNow(initialIso: string, intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.parse(initialIso));
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
