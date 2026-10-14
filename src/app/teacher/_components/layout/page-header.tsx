"use client";

import { PanelLeftClose, PanelLeftOpen, GraduationCap } from "lucide-react";
import HeaderClock from "@/app/teacher/_components/layout/header-clock";
import FinishBell from "@/app/teacher/_components/layout/finish-bell";
import { useShell } from "@/app/teacher/_components/layout/shell-context";
import { cn } from "@/lib/utils";
import { displaySchoolYear, useActiveSchoolYear } from "@/hooks/useActiveSchoolYear";

/**
 * The header bar every teacher page renders as its first element: sidebar
 * toggle and that page's action button in one sticky bar.
 *
 * The negative margins cancel <main>'s padding so the bar runs edge to edge.
 * On the left, the same -6 lands it against the rail: below md it cancels
 * main's left padding, and at md+ (where main has pl-0) it pulls across the
 * shell's md:gap-6. The wrapper's cream background is what page content
 * scrolls under once the bar sticks.
 *
 * By default the bar sits flush against the page content below it: mb-0
 * beats the margin-block-end that a parent's space-y-* would otherwise put
 * on the bar (Tailwind v4 emits that rule inside :where(), so it carries no
 * specificity). Pages that want a gap pass their own mb-* through className
 * — every teacher page currently passes mb-5 — which overrides the mb-0
 * via cn()'s tailwind-merge. A margin-top on the following element will not
 * work; see the note on [&+*]:mt-0 below.
 */
export default function PageHeader({
  actions,
  actionsLast = false,
  center,
  start,
  className,
}: {
  actions?: React.ReactNode;
  /**
   * Give the action button the right-hand corner and slide the date to its
   * left. Off by default: the date holds the corner on every other page.
   */
  actionsLast?: boolean;
  /**
   * Absolutely centered in the bar, independent of how wide the left toggle
   * or right actions/date cluster are — a flex child centered with margin
   * auto would drift off-center whenever those two sides are uneven widths.
   */
  center?: React.ReactNode;
  /** Replaces the school-year label next to the sidebar toggle. */
  start?: React.ReactNode;
  className?: string;
}) {
  const shell = useShell();
  // undefined while loading, so nothing flashes before the real year arrives.
  const schoolYear = useActiveSchoolYear();

  const date = shell?.today ? (
    <HeaderClock initialDate={shell.today} />
  ) : null;

  return (
    <div
      // Prevent the element immediately following PageHeader from adding
      // explicit top margin (mt-*). In Tailwind v4, space-y-* uses
      // margin-block-end on preceding children, so this does not cancel
      // the parent's space-y spacing.
      className={cn(
        "sticky top-0 z-30 -mx-4 -mt-4 mb-0 bg-[#eae4c9] [&+*]:mt-0 sm:-mx-6 sm:-mt-6",
        // The classroom window's <main> has no padding to cancel, so the bar would overflow the viewport.
        shell?.hideSidebar && "m-0 sm:m-0",
        className,
      )}
    >
      {/* min-h-14 keeps the bar at the height the breadcrumb used to give it,
          now that nothing in the middle sets one. */}
      <header className="relative flex min-h-14 items-center gap-3 border-b border-gray-200/80 bg-white px-4 py-2.5 shadow-sm">
        {shell && !shell.hideSidebar && (
          <button
            type="button"
            onClick={shell.toggle}
            aria-label={shell.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!shell.collapsed}
            title={shell.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="relative hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-gray-500/10 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[#5b0610] motion-reduce:transition-none md:inline-flex"
          >
            {/* Both icons stay mounted and stacked so they cross-fade; the
                button's aria-label carries the meaning, so neither is read. */}
            <PanelLeftClose
              size={18}
              aria-hidden="true"
              className={cn(
                "absolute transition-opacity duration-200 motion-reduce:transition-none",
                shell.collapsed ? "opacity-0" : "opacity-100",
              )}
            />
            <PanelLeftOpen
              size={18}
              aria-hidden="true"
              className={cn(
                "absolute transition-opacity duration-200 motion-reduce:transition-none",
                shell.collapsed ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        )}

        {start}

        {!start && !shell?.hideSidebar && (
          <div className="hidden shrink-0 items-center gap-1.5 px-2.5 py-1 md:flex">
            <GraduationCap className="size-[18px] shrink-0 text-gray-700" />
            <span className="whitespace-nowrap text-[13px] font-semibold text-gray-700">
              {schoolYear === undefined
                ? ""
                : schoolYear
                  ? `${displaySchoolYear(schoolYear.name)}${schoolYear.activeQuarter ? ` · ${schoolYear.activeQuarter}` : ""}`
                  : "No Active School Year"}
            </span>
          </div>
        )}

        {center && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {center}
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {actionsLast && date}
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
          {!actionsLast && date}
          {!shell?.hideSidebar && (
            <>
              <div className="h-6 w-px shrink-0 bg-gray-200" />
              <FinishBell />
            </>
          )}
        </div>
      </header>
    </div>
  );
}
