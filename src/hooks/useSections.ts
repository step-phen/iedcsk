"use client";

import { useEffect, useState } from "react";
import type { Section } from "@/types/db";
import { apiFetch } from "@/lib/api";

/**
 * The in-flight (or settled) request, shared by every mount — same reasoning
 * as useProvinces: the Add Learner form stays mounted between opens, so this
 * avoids refetching the same rows on every reopen within one page load.
 */
let sectionsRequest: Promise<Section[]> | null = null;

function fetchSections(): Promise<Section[]> {
  sectionsRequest ??= apiFetch("/api/sections")
    .then(async (res) => {
      if (!res.ok) throw new Error(`GET /api/sections failed: ${res.status}`);
      return (await res.json()) as Section[];
    })
    .catch((error) => {
      sectionsRequest = null;
      throw error;
    });

  return sectionsRequest;
}

/** Drop the cached list — call after creating a section so the next open
 *  (or an already-open form) shows it without a full page reload. */
export function invalidateSections(): void {
  sectionsRequest = null;
}

export interface UseSectionsResult {
  sections: Section[];
  loading: boolean;
  failed: boolean;
}

/** Loads the teacher's section list once `enabled` turns true. */
export function useSections(enabled: boolean): UseSectionsResult {
  const [sections, setSections] = useState<Section[]>([]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetchSections()
      .then((list) => {
        if (cancelled) return;
        setSections(list);
        setFailed(false);
        setLoaded(true);
      })
      .catch((error) => {
        console.error("[useSections]", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const loading = enabled && !loaded && !failed;

  return { sections, loading, failed };
}
