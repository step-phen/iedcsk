"use client";

import { createContext, useContext } from "react";
import type { Notifications } from "@/app/teacher/_components/layout/use-notifications";

export type ShellState = {
  collapsed: boolean;
  toggle: () => void;
  /** Today's date in PH time, formatted on the server — see teacher/layout.tsx. */
  today: string;
  /** True on the popup-style classroom window, which drops the rail, its toggle and the school year, and draws its own header bell. */
  hideSidebar: boolean;
  /** Learner finishes polled once for the whole shell, so navigation never resets them. */
  notifications: Notifications;
};

/**
 * TeacherShell owns the chrome state — the rail's collapsed flag and the date
 * the server computed for this request — but the parts that use it (the
 * collapse toggle, the header's date) live in PageHeader, which each page
 * renders. Context carries it across that gap without either component
 * importing the other.
 */
export const ShellContext = createContext<ShellState | null>(null);

/** Returns null outside the teacher shell, so PageHeader can just omit both. */
export function useShell(): ShellState | null {
  return useContext(ShellContext);
}
