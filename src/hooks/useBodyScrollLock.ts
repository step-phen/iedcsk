"use client";

import { useEffect } from "react";

/**
 * Locks page scroll while `locked` is true — for any full-screen modal
 * overlay. Compensates the scrollbar's own width with right padding so the
 * page doesn't shift horizontally when the scrollbar disappears.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [locked]);
}
