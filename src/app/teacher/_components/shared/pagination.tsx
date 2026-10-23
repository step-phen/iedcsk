import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_BUTTON_CLASS =
  "inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-xs outline-none transition-colors duration-100 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white";

/** Learner list footer; always shown, so the count reads the same on a one-page or empty list. */
export default function Pagination({
  start,
  shownOnPage,
  total,
  page,
  pageCount,
  onPageChange,
}: {
  start: number;
  shownOnPage: number;
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Learner pages"
      className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-600"
    >
      <p aria-live="polite" className="tabular-nums">
        {total === 0
          ? "Showing 0 learners"
          : `Showing ${start + 1}–${start + shownOnPage} of ${total} ${total === 1 ? "learner" : "learners"}`}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={PAGE_BUTTON_CLASS}>
          <ChevronLeft size={14} aria-hidden="true" />
          Previous
        </button>
        <span className="whitespace-nowrap font-semibold text-gray-700 tabular-nums">
          Page {page} of {pageCount}
        </span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className={PAGE_BUTTON_CLASS}>
          Next
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
