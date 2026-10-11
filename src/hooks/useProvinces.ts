"use client";

import { useEffect, useState } from "react";
import type { Province } from "@/types/db";
import { apiFetch } from "@/lib/api";

/**
 * The in-flight (or settled) request, shared by every mount.
 *
 * Both address forms can be opened repeatedly in one visit, and the Add form
 * stays mounted between opens — without this, each open fires its own request
 * for the same 82 unchanging rows. One promise per page load: reopening the
 * modal reuses it, a real navigation starts over.
 */
let provincesRequest: Promise<Province[]> | null = null;

function fetchProvinces(): Promise<Province[]> {
  provincesRequest ??= apiFetch("/api/provinces")
    .then(async (res) => {
      if (!res.ok) throw new Error(`GET /api/provinces failed: ${res.status}`);
      return (await res.json()) as Province[];
    })
    .catch((error) => {
      // Don't cache a failure — a teacher who reopens the form after a blip
      // should get a fresh attempt rather than the same rejected promise.
      provincesRequest = null;
      throw error;
    });

  return provincesRequest;
}

export interface UseProvincesResult {
  provinces: Province[];
  loading: boolean;
  /** True when the list could not be loaded — the form shows a plain text box. */
  failed: boolean;
}

/**
 * Loads the province list once `enabled` turns true — i.e. when the form that
 * needs it is actually opened, not while the learners page sits polling.
 */
export function useProvinces(enabled: boolean): UseProvincesResult {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || provinces.length > 0) return;

    let cancelled = false;

    fetchProvinces()
      .then((list) => {
        if (cancelled) return;
        setProvinces(list);
        setFailed(false);
      })
      .catch((error) => {
        console.error("[useProvinces]", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, provinces.length]);

  // Derived, not stored: setting a loading flag in the effect body is a
  // synchronous setState inside an effect, which cascades an extra render.
  // "Open, nothing loaded yet, and not given up" is exactly what loading means.
  const loading = enabled && provinces.length === 0 && !failed;

  return { provinces, loading, failed };
}
