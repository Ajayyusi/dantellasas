"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { getClientDb } from "@/lib/firebase/client";

/**
 * Keeps the calendar live: when anyone books, moves or cancels in this branch
 * and period, refresh the server-rendered data. Read-only listener, allowed by
 * firestore.rules for members with view_all_appointments.
 */
export function useLiveCalendar(orgId: string, branchId: string, from: string, to: string, enabled: boolean) {
  const router = useRouter();
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    first.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe = () => {};
    try {
      const q = query(
        collection(getClientDb(), "organizations", orgId, "appointments"),
        where("branchId", "==", branchId),
        where("dateKey", ">=", from),
        where("dateKey", "<=", to),
      );
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (first.current) {
            first.current = false;
            return;
          }
          if (snap.metadata.hasPendingWrites) return;
          clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 400);
        },
        () => {
          /* permission or network error: the page still works without live updates */
        },
      );
    } catch {
      /* Firebase not configured in this environment */
    }
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [orgId, branchId, from, to, enabled, router]);
}
