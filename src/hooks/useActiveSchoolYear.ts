"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SchoolYear } from "@/types/db";
import { apiFetch } from "@/lib/api";

/**
 * The active school year from the database, shared by every mount so the
 * header updates the moment Settings activates another year.
 * undefined = not loaded yet, null = no active school year.
 */
let activeYear: SchoolYear | null | undefined;
let request: Promise<void> | null = null;
let failed = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call after activating a year so every reader shows it without a reload. */
export function setActiveSchoolYear(year: SchoolYear | null): void {
  activeYear = year;
  failed = false;
  listeners.forEach((l) => l());
}

function load(): Promise<void> {
  request ??= apiFetch("/api/school-years/active")
    .then(async (res) => {
      if (!res.ok) throw new Error(`GET /api/school-years/active failed: ${res.status}`);
      setActiveSchoolYear((await res.json()) as SchoolYear | null);
    })
    .catch((error) => {
      // Leave it unloaded so the next mount retries.
      console.error("[useActiveSchoolYear]", error);
      request = null;
      failed = true;
      listeners.forEach((l) => l());
    });
  return request;
}

/** Refetch after changing the active year or quarter so the header shows both. */
export function reloadActiveSchoolYear(): Promise<void> {
  request = null;
  return load();
}

export function useActiveSchoolYear(): SchoolYear | null | undefined {
  const year = useSyncExternalStore(
    subscribe,
    () => activeYear,
    () => undefined,
  );

  useEffect(() => {
    void load();
  }, []);

  return year;
}

/** True once loading failed, so a form can say so instead of guessing a year. */
export function useActiveSchoolYearFailed(): boolean {
  return useSyncExternalStore(subscribe, () => failed, () => false);
}

/** "2026-2027" (database format) -> "SY 2026–2027" (display format). */
export const displaySchoolYear = (name: string) => `SY ${name.replace("-", "–")}`;
