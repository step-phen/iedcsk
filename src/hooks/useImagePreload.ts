"use client";

import { useEffect } from "react";

// Module-level, survives remounts — a URL warmed once for a round never
// re-fires window.Image() again for the life of the tab.
const preloaded = new Set<string>();

export function preloadImages(urls: (string | undefined | null)[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const img = new window.Image();
    img.src = url; // decodes into the browser cache; nothing rendered
  }
}

/** Warms the *next* round's art only — call with next-round urls, never the
 * whole activity's asset list. */
export function useImagePreload(urls: (string | undefined | null)[]) {
  const key = urls.filter(Boolean).join("|");
  useEffect(() => {
    preloadImages(urls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
