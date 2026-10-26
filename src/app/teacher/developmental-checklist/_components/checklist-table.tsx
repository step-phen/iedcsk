"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Gamepad2, MessageSquareText, Pencil, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api";
import { middleInitial } from "@/lib/learners";
import { cn, CONTENT_HAS_RECORDS_HINT } from "@/lib/utils";
import SectionSelector, { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import Segmented from "@/app/teacher/_components/shared/segmented";
import Pagination from "@/app/teacher/_components/shared/pagination";
import type { Section } from "@/types/db";
import type { PracticalResultValue } from "@/constants/enums";
import { RESULT_CLASS, percentOf, ratingBand, ratingLabel, scoreBand } from "@/lib/score-band";

export type Rating = "achieved" | "developing" | "needs_support" | "not_yet_observed";

export type SectionChecklist = {
  quarters: { quarter: number; quarterName: string }[];
  domains: {
    domainId: number;
    domainName: string;
    items: ChecklistItem[];
    /** hasRecords: learners already played it, so a skill can't be linked to it (API rule). */
    activities: { activityId: number; name: string; quarter: number; hasRecords: boolean }[];
  }[];
  learners: { enrollmentId: number; learnerId: number; firstName: string; middleName: string | null; lastName: string }[];
  ratings: { enrollmentId: number; itemId: number; quarter: number; rating: Rating; remarks: string | null }[];
  /** Each learner's latest result on the games linked to a skill. */
  results: ({ enrollmentId: number; activityId: number } & ActivityResult)[];
};

type ActivityResult = { score: number; maxScore: number } | { rating: PracticalResultValue | null };

/** hasRecords: rated, or linked to a game with records (API rule); viewable, never changed again. */
type ChecklistItem = { itemId: number; item: string; quarter: number; activityId: number | null; activityName: string | null; hasRecords: boolean };

export const RATING_BADGE: Record<Rating, { label: string; className: string }> = {
  achieved: { label: "Achieved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  developing: { label: "Developing", className: "bg-amber-100 text-amber-700 border-amber-200" },
  needs_support: { label: "Needs support", className: "bg-red-100 text-red-700 border-red-200" },
  not_yet_observed: { label: "Not yet observed", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

// The picked rating's button fills with its color so the choice reads from across the room.
const RATING_SOLID: Record<Rating, string> = {
  achieved: "border-emerald-700 bg-emerald-700 text-white",
  developing: "border-amber-400 bg-amber-400 text-amber-950",
  needs_support: "border-red-600 bg-red-600 text-white",
  not_yet_observed: "border-gray-500 bg-gray-500 text-white",
};

const DOT_CLASS: Record<Rating, string> = {
  achieved: "bg-emerald-500",
  developing: "bg-amber-400",
  needs_support: "bg-red-500",
  not_yet_observed: "bg-gray-400",
};

const RATINGS = Object.keys(RATING_BADGE) as Rating[];

// Learners per page in the Rate view.
const PAGE_SIZE = 5;

// Keeps the Learner column visibly separate while the item columns scroll under it.
const STICKY_EDGE = "shadow-[inset_-1px_0_0_var(--color-gray-200)]";

const ICON_BUTTON =
  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 outline-none transition-colors hover:border-sidebar hover:text-sidebar focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-700";

// The learner's latest result on the skill's game: a colored score, a practical rating, or why there is none.
function ResultBadge({ result, compact = false }: { result: ActivityResult | undefined; compact?: boolean }) {
  const pill = cn("inline-block rounded-full font-semibold whitespace-nowrap tabular-nums", compact ? "px-1.5 text-[10px]" : "px-2 py-0.5 text-xs");
  if (!result) return <span className={cn("text-gray-400", compact ? "text-[10px]" : "text-xs")}>Not done yet</span>;
  if ("score" in result) {
    return (
      <span title={`Activity score: ${result.score} of ${result.maxScore}`} className={cn(pill, RESULT_CLASS[scoreBand(percentOf(result.score, result.maxScore))])}>
        {result.score}/{result.maxScore}
      </span>
    );
  }
  if (!result.rating) {
    return (
      <span title="Practical activity waiting for your rating" className={cn(pill, "border border-dashed border-amber-400 text-amber-700")}>
        To rate
      </span>
    );
  }
  return <span className={cn(pill, RESULT_CLASS[ratingBand(result.rating)])}>{ratingLabel(result.rating)}</span>;
}

// "Plaza, Stephen A. V." style, the usual class-list order, with each word capitalized.
function learnerName(l: SectionChecklist["learners"][number]) {
  const initial = middleInitial(l.middleName);
  return `${l.lastName}, ${l.firstName}${initial ? ` ${initial}` : ""}`.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export default function ChecklistTable({
  header,
  sections,
  sectionId,
  data,
  initialQuarter,
}: {
  header: React.ReactNode;
  sections: Section[];
  sectionId: number;
  data: SectionChecklist;
  /** ?quarter= from the URL, so a refresh stays on the same quarter. */
  initialQuarter?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [quarter, setQuarter] = useState(
    data.quarters.some((q) => String(q.quarter) === initialQuarter) ? initialQuarter! : String(data.quarters[0]?.quarter ?? 1),
  );
  const [domainId, setDomainId] = useState(String(data.domains[0]?.domainId ?? ""));
  // "rate" works one skill at a time with tap buttons; "overview" shows every skill as a read-only grid.
  const [view, setView] = useState<"rate" | "overview">("rate");
  const [skillIndex, setSkillIndex] = useState(0);

  const domain = data.domains.find((d) => String(d.domainId) === domainId) ?? data.domains[0];
  // Each quarter has its own items, matching that quarter's lessons and activities.
  const items = domain?.items.filter((i) => String(i.quarter) === quarter) ?? [];
  const index = Math.min(skillIndex, Math.max(items.length - 1, 0));
  const item = items[index];
  const ratings = new Map(data.ratings.map((r) => [`${r.enrollmentId}-${r.itemId}-${r.quarter}`, r]));
  // Ratings and remarks changed on this page since it loaded; null means cleared.
  const [edits, setEdits] = useState<Record<string, Rating | null>>({});
  const [remarkEdits, setRemarkEdits] = useState<Record<string, string | null>>({});
  const ratingOf = (key: string) => (key in edits ? edits[key] : (ratings.get(key)?.rating ?? null));
  const remarksOf = (key: string) => (key in remarkEdits ? remarkEdits[key] : (ratings.get(key)?.remarks ?? null));
  const keyOf = (enrollmentId: number, itemId: number) => `${enrollmentId}-${itemId}-${quarter}`;
  const results = new Map(data.results.map((r) => [`${r.enrollmentId}-${r.activityId}`, r]));
  const resultOf = (enrollmentId: number, activityId: number | null) => (activityId ? results.get(`${enrollmentId}-${activityId}`) : undefined);
  // The cell whose remarks are open in the modal.
  const [remarksCell, setRemarksCell] = useState<RemarksCell | null>(null);
  // The item form: "new" adds one, an item edits it.
  const [itemForm, setItemForm] = useState<"new" | ChecklistItem | null>(null);
  const [search, setSearch] = useState("");
  // Overview only: "unrated" keeps learners with a skill still not rated; a rating keeps those with at least one skill at it.
  const [status, setStatus] = useState<"" | "unrated" | Rating>("");
  const shownLearners = data.learners.filter(
    (l) =>
      learnerName(l).toLowerCase().includes(search.trim().toLowerCase()) &&
      (view === "rate" ||
        !status ||
        items.some((it) => {
          const r = ratingOf(keyOf(l.enrollmentId, it.itemId));
          return status === "unrated" ? !r : r === status;
        })),
  );
  // Rate view pages the filtered list, so a search reaches every learner; the page stays put across skills.
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(shownLearners.length / PAGE_SIZE));
  // Only the Rate view pages; an Overview status filter must not move its saved page.
  if (view === "rate" && page > pageCount) setPage(pageCount);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageLearners = shownLearners.slice(start, start + PAGE_SIZE);
  // Counts the whole section, not just this page.
  const ratedCount = item ? data.learners.filter((l) => ratingOf(keyOf(l.enrollmentId, item.itemId))).length : 0;

  function changeQuarter(next: string) {
    setQuarter(next);
    setSkillIndex(0);
    // Client-only URL update, so a refresh keeps the quarter without reloading the checklist.
    window.history.replaceState(null, "", `${pathname}?section=${sectionId}&quarter=${next}`);
  }

  // Shows the new rating at once and puts the old one back if the server rejects it.
  async function rate(enrollmentId: number, itemId: number, rating: Rating | null) {
    const key = keyOf(enrollmentId, itemId);
    const previous = ratingOf(key);
    const previousRemarks = remarksOf(key);
    setEdits((e) => ({ ...e, [key]: rating }));
    // The server drops the remarks along with a cleared rating.
    if (rating === null) setRemarkEdits((e) => ({ ...e, [key]: null }));
    try {
      const res = await apiFetch(`/api/sections/${sectionId}/checklist/ratings`, {
        method: "PUT",
        body: JSON.stringify({ enrollmentId, itemId, quarter: Number(quarter), rating }),
      });
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        throw new Error(Object.values(errors)[0]?.[0]);
      }
      if (!res.ok) throw new Error();
    } catch (error) {
      setEdits((e) => ({ ...e, [key]: previous }));
      setRemarkEdits((e) => ({ ...e, [key]: previousRemarks }));
      toast.error(error instanceof Error && error.message ? error.message : "Could not save the rating. Please try again.", {
        position: "top-center",
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* The page title sits here, beside the add button that needs this table's domain and quarter. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header}
        {domain && (
          <button
            type="button"
            onClick={() => setItemForm("new")}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-3.5 py-2 text-xs font-semibold text-white shadow-md outline-none transition-colors hover:bg-[#7e1422] focus-visible:ring-2 focus-visible:ring-sidebar/40"
          >
            <Plus size={14} aria-hidden="true" />
            Checklist Item
          </button>
        )}
      </div>

      {/* Same filter look as the Classroom Record page. */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <SectionSelector sections={sections} selectedSectionId={sectionId} />
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          Area
          <select
            name="domain"
            value={domainId}
            onChange={(e) => {
              setDomainId(e.target.value);
              setSkillIndex(0);
            }}
            className={SELECT_CLASS}
          >
            {data.domains.map((d) => (
              <option key={d.domainId} value={d.domainId}>
                {d.domainName}
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="Quarter"
          options={data.quarters.map((q) => ({ value: String(q.quarter), label: `Q${q.quarter}`, ariaLabel: q.quarterName }))}
          value={quarter}
          onChange={changeQuarter}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="View"
          hideLabel
          options={[
            { value: "rate", label: "Rate one skill" },
            { value: "overview", label: "Overview" },
          ]}
          value={view}
          onChange={(v) => setView(v as typeof view)}
        />
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <input
            type="search"
            name="search"
            aria-label="Search learner"
            placeholder="Search learner"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={cn(SELECT_CLASS, "w-48 cursor-text placeholder:text-gray-500")}
          />
          {view === "overview" && (
            <select
              name="status"
              aria-label="Rating status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={SELECT_CLASS}
            >
              <option value="">All ratings</option>
              <option value="unrated">Not rated</option>
              {RATINGS.map((r) => (
                <option key={r} value={r}>
                  {RATING_BADGE[r].label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {data.learners.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-500">No learners enrolled in this section yet.</p>
        ) : !item ? (
          <p className="px-4 py-12 text-center text-sm text-gray-500">No checklist items for this area in this quarter yet.</p>
        ) : view === "rate" ? (
          <>
            <div className="space-y-3 border-b border-gray-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-500">
                    Skill {index + 1} of {items.length}
                  </p>
                  <h2 className="text-base font-bold leading-snug text-gray-900">{item.item}</h2>
                  {/* The activity the skill is practised in, so the teacher knows what the rating is based on. */}
                  {item.activityName && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-sidebar">
                      <Gamepad2 size={13} aria-hidden="true" className="shrink-0" />
                      Practised in: {item.activityName}
                      <span className="font-normal text-gray-500">· each learner&apos;s latest score is shown beside their name</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setItemForm(item)}
                  disabled={item.hasRecords}
                  title={item.hasRecords ? CONTENT_HAS_RECORDS_HINT : undefined}
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 outline-none transition-colors hover:border-sidebar hover:text-sidebar focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-700"
                >
                  <Pencil size={13} aria-hidden="true" />
                  Edit skill
                </button>
                <button type="button" onClick={() => setSkillIndex(index - 1)} disabled={index === 0} aria-label="Previous skill" className={ICON_BUTTON}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setSkillIndex(index + 1)}
                  disabled={index === items.length - 1}
                  aria-label="Next skill"
                  className={ICON_BUTTON}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-label="Learners rated on this skill"
                  aria-valuemin={0}
                  aria-valuemax={data.learners.length}
                  aria-valuenow={ratedCount}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"
                >
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${(ratedCount / data.learners.length) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-700">
                  {ratedCount} of {data.learners.length} rated
                </span>
              </div>
            </div>

            {shownLearners.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-gray-500">No learners match this search.</p>
            ) : (
              // Header and rows share column widths and never wrap, so they stay aligned; narrow screens scroll sideways.
              <div className="overflow-x-auto">
                {/* Hidden from screen readers: each row's controls already carry their own labels. */}
                <div
                  aria-hidden="true"
                  className="flex min-w-xl items-center gap-x-4 border-b border-gray-200 bg-gray-50 px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-600"
                >
                  <span className="w-52 shrink-0">Learner Name</span>
                  {item.activityId && <span className="w-24 shrink-0">Score</span>}
                  <span className="flex-1">Skill Status</span>
                  <span className="w-16 shrink-0 text-center">Remarks</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {pageLearners.map((l) => {
                    const name = learnerName(l);
                    const rating = ratingOf(keyOf(l.enrollmentId, item.itemId));
                    const remarks = remarksOf(keyOf(l.enrollmentId, item.itemId));
                    // A skill linked to a game unlocks once the learner has finished it; the server enforces the same rule.
                    const locked = !!item.activityId && !resultOf(l.enrollmentId, item.activityId);
                    return (
                      <li key={l.enrollmentId} className="flex min-w-xl items-center gap-x-4 px-5 py-2.5">
                        <span className="w-52 shrink-0 truncate text-sm font-semibold text-gray-900">{name}</span>
                        {item.activityId && (
                          <span className="w-24 shrink-0">
                            <span className="sr-only">Activity result: </span>
                            <ResultBadge result={resultOf(l.enrollmentId, item.activityId)} />
                          </span>
                        )}
                        {/* Tap to rate; tapping the picked rating again clears it. */}
                        <div role="group" aria-label={`Rating for ${name}`} className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                          {RATINGS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={rating === r}
                              // An older rating on a locked skill can still be tapped to clear it.
                              disabled={locked && rating !== r}
                              title={locked ? `Wait until ${name} finishes ${item.activityName}` : undefined}
                              onClick={() => rate(l.enrollmentId, item.itemId, rating === r ? null : r)}
                              className={cn(
                                "h-8 cursor-pointer rounded-full border px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-40",
                                rating === r ? RATING_SOLID[r] : "border-gray-300 bg-white text-gray-700 enabled:hover:border-gray-400 enabled:hover:bg-gray-50",
                              )}
                            >
                              {RATING_BADGE[r].label}
                            </button>
                          ))}
                        </div>
                        {/* Remarks belong to a rating, so the button waits until the skill is rated; a filled button means remarks are saved. */}
                        <span className="flex w-16 shrink-0 justify-center">
                          <button
                            type="button"
                            disabled={!rating}
                            onClick={() => setRemarksCell({ enrollmentId: l.enrollmentId, itemId: item.itemId, learner: name, item: item.item })}
                            aria-label={`${remarks ? "Edit" : "Add"} remarks for ${name}`}
                            title={!rating ? "Rate this skill first to add remarks" : (remarks ?? "Add remarks")}
                            className={cn(
                              ICON_BUTTON,
                              "rounded-full",
                              remarks && "border-sidebar bg-sidebar text-white hover:text-white",
                            )}
                          >
                            <MessageSquareText size={14} aria-hidden="true" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Pagination
              start={start}
              shownOnPage={pageLearners.length}
              total={shownLearners.length}
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
            <p className="border-t border-gray-100 px-5 py-2.5 text-xs text-gray-500">
              Tap a rating to save it. Tap it again to clear it.
              {item.activityId && " Ratings unlock once the learner finishes the activity."}
            </p>
          </>
        ) : shownLearners.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-500">No learners match these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th scope="col" className={cn("sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500", STICKY_EDGE)}>
                      Learner
                    </th>
                    {items.map((it, i) => (
                      <th key={it.itemId} scope="col" className="min-w-36 px-3 py-3 text-left align-top text-xs font-semibold text-gray-700">
                        {/* The skill name opens it in the Rate view. */}
                        <button
                          type="button"
                          onClick={() => {
                            setSkillIndex(i);
                            setView("rate");
                          }}
                          title="Rate this skill"
                          className="cursor-pointer text-left outline-none hover:text-sidebar hover:underline focus-visible:ring-2 focus-visible:ring-sidebar/30"
                        >
                          {it.item}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownLearners.map((l) => (
                    <tr key={l.enrollmentId} className="border-b border-gray-100 last:border-b-0">
                      <th scope="row" className={cn("sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 text-left font-semibold text-gray-900", STICKY_EDGE)}>
                        {learnerName(l)}
                      </th>
                      {items.map((it) => {
                        const rating = ratingOf(keyOf(l.enrollmentId, it.itemId));
                        const remarks = remarksOf(keyOf(l.enrollmentId, it.itemId));
                        return (
                          <td key={it.itemId} className="px-3 py-2.5">
                            <span className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1">
                                {rating ? (
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap", RATING_BADGE[rating].className)}>
                                    {RATING_BADGE[rating].label}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Not rated</span>
                                )}
                                {remarks && (
                                  <span title={remarks} className="shrink-0 text-sidebar">
                                    <MessageSquareText size={13} aria-hidden="true" />
                                    <span className="sr-only">Has remarks</span>
                                  </span>
                                )}
                              </span>
                              {it.activityId && <ResultBadge result={resultOf(l.enrollmentId, it.activityId)} compact />}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-2.5 text-xs text-gray-600">
              {RATINGS.map((r) => (
                <span key={r} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn("size-2.5 rounded-full", DOT_CLASS[r])} />
                  {RATING_BADGE[r].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <MessageSquareText size={12} aria-hidden="true" className="text-sidebar" />
                Has remarks
              </span>
              <span className="text-gray-500">Click a skill name to rate it.</span>
            </div>
          </>
        )}
      </div>

      <RemarksModal
        cell={remarksCell}
        sectionId={sectionId}
        quarter={Number(quarter)}
        rating={remarksCell ? ratingOf(keyOf(remarksCell.enrollmentId, remarksCell.itemId)) : null}
        remarks={remarksCell ? remarksOf(keyOf(remarksCell.enrollmentId, remarksCell.itemId)) : null}
        onClose={() => setRemarksCell(null)}
        onSaved={(saved) => {
          if (remarksCell) setRemarkEdits((e) => ({ ...e, [keyOf(remarksCell.enrollmentId, remarksCell.itemId)]: saved }));
          setRemarksCell(null);
        }}
      />

      {domain && itemForm && (
        <ItemModal
          // Keyed so each opening starts fresh from the item being edited.
          key={itemForm === "new" ? "new" : itemForm.itemId}
          item={itemForm === "new" ? null : itemForm}
          onClose={() => setItemForm(null)}
          domain={domain}
          quarter={Number(quarter)}
          quarterName={data.quarters.find((q) => String(q.quarter) === quarter)?.quarterName ?? ""}
          // Reloads the checklist from the server so the new skill appears.
          onSaved={() => {
            setItemForm(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] bg-white ${err ? "border-red-400" : "border-gray-400"}`;

// Adds a skill to the selected domain and quarter, or edits one, optionally linked to the game that practises it.
function ItemModal({
  item,
  onClose,
  domain,
  quarter,
  quarterName,
  onSaved,
}: {
  item: ChecklistItem | null;
  onClose: () => void;
  domain: SectionChecklist["domains"][number];
  quarter: number;
  quarterName: string;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ item?: string; activityId?: string; form?: string }>({});
  const activities = domain.activities.filter((a) => a.quarter === quarter);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setErrors({});
    try {
      const res = await apiFetch(item ? `/api/checklist-items/${item.itemId}` : "/api/checklist-items", {
        method: item ? "PUT" : "POST",
        body: JSON.stringify({
          domainId: domain.domainId,
          quarter,
          item: form.get("item"),
          activityId: form.get("activityId") ? Number(form.get("activityId")) : null,
        }),
      });
      if (res.ok) {
        toast.success(item ? "Checklist item saved!" : "Checklist item added!", { position: "top-center" });
        onSaved();
        return;
      }
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        if (errors.protected) {
          // Rated or played since the page loaded: refetch so its Edit locks too.
          toast.error(errors.protected[0], { position: "top-center" });
          onSaved();
          return;
        }
        setErrors({
          item: errors.item?.[0],
          activityId: errors.activityId?.[0],
          form: errors.domainId?.[0] ?? errors.quarter?.[0],
        });
      } else {
        setErrors({ form: "Could not save the checklist item. Please try again." });
      }
    } catch {
      setErrors({ form: "Could not reach the server. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title={item ? "Edit Checklist Item" : "Add Checklist Item"}
      subtitle={`${domain.domainName} • ${quarterName}`}
      headerId="add-checklist-item-title"
      maxWidth="max-w-md"
      headerPadding="px-5 py-3"
      titleSize="text-base"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor="ci-item" className="block text-xs font-bold text-gray-700 mb-1.5">
            Skill <span className="text-red-500">*</span>
          </label>
          <input
            id="ci-item"
            name="item"
            autoFocus
            maxLength={100}
            defaultValue={item?.item}
            placeholder="e.g. Counts objects 1 to 5"
            aria-invalid={!!errors.item}
            className={inp(errors.item)}
          />
          {errors.item && <p className="text-xs text-red-500 mt-1">{errors.item}</p>}
        </div>

        <div>
          <label htmlFor="ci-activity" className="block text-xs font-bold text-gray-700 mb-1.5">
            Activity
          </label>
          <select id="ci-activity" name="activityId" defaultValue={item?.activityId ?? ""} aria-invalid={!!errors.activityId} className={inp(errors.activityId)}>
            <option value="">None</option>
            {activities.map((a) => (
              // Its past results would become this skill's evidence, so the API refuses the link.
              <option key={a.activityId} value={a.activityId} disabled={a.hasRecords && a.activityId !== item?.activityId}>
                {a.name}
                {a.hasRecords ? " (has records)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">The game where learners practise this skill.</p>
          {errors.activityId && <p className="text-xs text-red-500 mt-1">{errors.activityId}</p>}
        </div>

        {errors.form && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errors.form}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6 text-sm border-gray-400">
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm">
            {pending ? "Saving..." : item ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

type RemarksCell = { enrollmentId: number; itemId: number; learner: string; item: string };

// The teacher's note on one rating; saved with the rating it belongs to, and a blank note clears it.
function RemarksModal({
  cell,
  sectionId,
  quarter,
  rating,
  remarks,
  onClose,
  onSaved,
}: {
  cell: RemarksCell | null;
  sectionId: number;
  quarter: number;
  rating: Rating | null;
  remarks: string | null;
  onClose: () => void;
  onSaved: (remarks: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Starts each opening from the saved remarks, adjusting state during render rather than in an effect.
  const [openedFor, setOpenedFor] = useState<RemarksCell | null>(null);
  if (cell !== openedFor) {
    setOpenedFor(cell);
    setDraft(remarks ?? "");
    setError(null);
  }

  async function save() {
    if (!cell) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/sections/${sectionId}/checklist/ratings`, {
        method: "PUT",
        body: JSON.stringify({ enrollmentId: cell.enrollmentId, itemId: cell.itemId, quarter, rating, remarks: draft.trim() || null }),
      });
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setError(Object.values(errors)[0]?.[0] ?? "Could not save the remarks.");
        return;
      }
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { remarks: string | null };
      onSaved(body.remarks);
      toast.success("Remarks saved.", { position: "top-center" });
    } catch {
      setError("Could not save the remarks. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={cell !== null}
      onClose={onClose}
      title="Remarks"
      subtitle={cell ? `${cell.learner} - ${cell.item}` : undefined}
      headerId="checklist-remarks-title"
      maxWidth="max-w-md"
    >
      <form
        className="space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {rating && (
          <p className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            Rating:
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", RATING_BADGE[rating].className)}>{RATING_BADGE[rating].label}</span>
          </p>
        )}
        <label htmlFor="checklist-remarks" className="sr-only">
          Remarks
        </label>
        <textarea
          id="checklist-remarks"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          placeholder="What did you notice? e.g. Matched all five shapes on her own."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#5b0610] focus:ring-2 focus:ring-[#5b0610]/10"
        />
        <div className="flex items-center justify-between gap-3">
          <p className={cn("text-xs", error ? "font-medium text-red-600" : "text-gray-500")} role={error ? "alert" : undefined}>
            {error ?? `${draft.trim().length}/500`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a0e1c] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
