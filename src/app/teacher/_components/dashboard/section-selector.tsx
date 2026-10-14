"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Section } from "@/types/db";
import { sectionLabel } from "@/hooks/useSections";
// Bordered white box, same look as the Learners header's outlined "Classroom"
// button (class-list.tsx), at h-8 text-xs to line up with Add Learners.
export const SELECT_CLASS =
  "h-8 px-3 text-xs text-black bg-white border border-stone-300 shadow-xs hover:border-sidebar focus:border-sidebar focus:outline-none focus:ring-2 focus:ring-sidebar/20 transition-colors rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-stone-300";

// Just the last section picked, so returning to the dashboard without a
// `?section=` in the URL (e.g. from the sidebar) lands back where the
// teacher left off instead of resetting to the first section every time.
// Shared with the Modules page: it's the teacher's current class on both.
export const STORAGE_KEY = "teacher-dashboard-section-id";

/**
 * Dashboard's Section dropdown — same URL-driven pattern as the
 * Developmental Checklist's section select: changing it pushes `?section=`
 * onto the current path, the server component re-fetches, no client-side
 * filtering here. The URL is the source of truth (also what makes a refresh
 * remember the choice); localStorage only fills in when there's no `?section=`
 * at all yet, and only with a section the teacher still actually has.
 */
export default function SectionSelector({
  sections,
  selectedSectionId,
}: {
  sections: Section[];
  selectedSectionId: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Shows the picked section on the same frame instead of snapping back to
  // the server prop while the new render loads; reverts to the (by then
  // equal) prop once the navigation commits.
  const [optimisticId, setOptimisticId] = useOptimistic(selectedSectionId);
  // isPending drives data-pending below, which the dashboard dims against via
  // group-has-data-pending: CSS. Superseded navigations are dropped by the
  // router, so rapid switching always settles on the last pick.
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get("section")) return; // URL already says which one — never override an explicit choice.

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // Private mode, disabled storage, etc. — no remembered section, no harm done.
    }

    // Only honor it if that section still exists and is still this teacher's.
    if (stored && sections.some((s) => String(s.sectionId) === stored) && stored !== String(selectedSectionId)) {
      router.replace(`${pathname}?section=${stored}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when the section list itself changes.
  }, [sections]);

  return (
    <div className="flex items-center gap-2" data-pending={isPending ? "" : undefined}>
      <label htmlFor="dashboard-section" className="text-xs font-bold text-gray-700 shrink-0">
        Section
      </label>
      {sections.length === 0 ? (
        <select id="dashboard-section" disabled className={`${SELECT_CLASS} w-full md:w-auto`}>
          <option>No sections available</option>
        </select>
      ) : (
        <select
          id="dashboard-section"
          aria-label="Section"
          value={optimisticId ?? ""}
          onChange={(e) => {
            const nextSectionId = Number(e.target.value);
            try {
              localStorage.setItem(STORAGE_KEY, String(nextSectionId));
            } catch {
              // Private mode, disabled storage, etc. — the URL still carries the choice this visit.
            }
            startTransition(() => {
              setOptimisticId(nextSectionId);
              router.push(`${pathname}?section=${nextSectionId}`, { scroll: false });
            });
          }}
          className={`${SELECT_CLASS} w-full md:w-auto`}
        >
          {sections.map((s) => (
            <option key={s.sectionId} value={s.sectionId}>
              {sectionLabel(s)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
