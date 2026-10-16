"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import SectionSelector, { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import Segmented from "@/app/teacher/_components/shared/segmented";
import { PRACTICAL_RESULT_LABEL, type PracticalResultValue } from "@/constants/enums";
import type { Section } from "@/types/db";
import { hasMiddleName } from "@/lib/learners";
import { formatDatePH } from "@/lib/datetime";
import { RESULT_CLASS, percentOf, scoreBand } from "@/lib/score-band";
import { cn } from "@/lib/utils";

type ChecklistRating = "achieved" | "developing" | "needs_support" | "not_yet_observed";

/** One checklist skill, or one activity no skill of this quarter links to (GET /api/sections/{id}/classroom-record/strengths). */
interface Entry {
  kind: "skill" | "activity";
  itemId: number | null;
  item: string | null;
  activityId: number | null;
  activityName: string | null;
  format: "digital" | "practical" | null;
  status: "assessed" | "awaiting_rating" | "not_assessed";
  moduleDomainId: number | null;
  /** The teacher's checklist rating, the only skill status; null until the teacher assesses it. */
  teacherStatus: ChecklistRating | null;
  linkedActivityQuarter: number | null;
  checklist: { rating: ChecklistRating; remarks: string | null; at: string } | null;
  result: {
    score: number | null;
    maxScore: number | null;
    rating: PracticalResultValue | null;
    remarks: string | null;
    playedQuarter: number;
    at: string;
  } | null;
}

/** The Classroom Record total for one module row: points over assessed activities, percent null when none. */
interface ModuleSummary {
  moduleDomainId: number;
  total: number;
  assessed: number;
  earned: number;
  possible: number;
  percent: number | null;
}

export interface StrengthsData {
  quarter: number;
  rows: { moduleDomainId: number; subject: string; subheading: string | null }[];
  learners: {
    learnerId: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    extensionName: string | null;
    modules: ModuleSummary[];
    entries: Entry[];
  }[];
}

type Learner = StrengthsData["learners"][number];
type Row = StrengthsData["rows"][number];

const QUARTERS = [1, 2, 3, 4];

/** The Classroom Record bands, worded for recorded performance only. */
const BAND_LABEL: Record<PracticalResultValue, string> = {
  very_good: "Strength shown",
  good: "Developing",
  needs_help: "Needs Support",
};

const CHECKLIST_LABEL: Record<ChecklistRating, string> = {
  achieved: "Achieved",
  developing: "Developing",
  needs_support: "Needs Support",
  not_yet_observed: "Not yet observed",
};

const CHECKLIST_TONE: Record<ChecklistRating, string> = {
  achieved: RESULT_CLASS.very_good,
  developing: RESULT_CLASS.good,
  needs_support: RESULT_CLASS.needs_help,
  not_yet_observed: "bg-gray-100 text-gray-600",
};

const PILL = "inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums";

// Postgres sends "2026-10-16 09:30:00+08"; same parsing as the progress report editor.
const dateOf = (value: string) => formatDatePH(new Date(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")));

function learnerName(l: Learner) {
  return `${l.lastName}, ${[l.firstName, hasMiddleName(l.middleName) && l.middleName, l.extensionName].filter(Boolean).join(" ")}`;
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/(^|[\s,])(\w)/g, (m) => m.toUpperCase());
}

function rowLabel(row: Row) {
  return row.subheading ? `${titleCase(row.subject)} – ${titleCase(row.subheading)}` : titleCase(row.subject);
}

export default function StrengthsReport({
  sections,
  sectionId,
  report,
}: {
  sections: Section[];
  sectionId: number | null;
  report: StrengthsData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const quarter = report?.quarter ?? 1;

  const needle = search.trim().toLowerCase();
  const learners = (report?.learners ?? []).filter((l) => !needle || learnerName(l).toLowerCase().includes(needle));

  return (
    <div className="flex flex-col gap-3">
      <div className="material-bar sticky top-[4.25rem] z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 sm:px-5">
        <SectionSelector sections={sections} selectedSectionId={sectionId} />
        {sectionId !== null && (
          <>
            <Segmented
              label="Quarter"
              options={QUARTERS.map((q) => ({ value: String(q), label: `Q${q}`, ariaLabel: `Quarter ${q}` }))}
              value={String(quarter)}
              onChange={(q) =>
                startTransition(() =>
                  router.push(`/teacher/reports/classroom-record?tab=strengths&section=${sectionId}&quarter=${q}`, { scroll: false }),
                )
              }
            />
            <label className="flex w-full items-center gap-2 text-xs font-bold text-gray-700 sm:w-auto">
              Learner
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className={cn(SELECT_CLASS, "min-w-0 flex-1 cursor-text sm:flex-none")}
              />
            </label>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
        {sectionId === null ? (
          <Empty heading="No sections yet" message="Add a section in Settings › Sections." />
        ) : !report ? (
          <Empty heading="Could not load the report" message="Please refresh the page." />
        ) : (
          // Keyed by section and quarter so a new pick never shows the old one's learners; dimmed while it loads.
          <div
            key={`${sectionId}-${quarter}`}
            className={cn("space-y-3 animate-in fade-in duration-200 motion-reduce:animate-none transition-opacity", isPending && "opacity-50")}
          >
            <Legend />
            {report.learners.length === 0 ? (
              <Empty heading="No learners yet" message="Add learners to this section on the Learners page." />
            ) : learners.length === 0 ? (
              <Empty heading="No learner matches your search" message="Check the spelling, or clear the search." />
            ) : (
              learners.map((l) => <LearnerCard key={l.learnerId} learner={l} rows={report.rows} quarter={quarter} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-semibold text-gray-800">{heading}</p>
      <p className="text-xs text-gray-500 mt-1">{message}</p>
    </div>
  );
}

function Legend() {
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-600">
      <li>
        <b className="font-semibold text-gray-800">Activity performance</b> is the Classroom Record total: points earned ÷ points
        possible across the module&apos;s assessed activities this quarter. It shows recorded performance, not mastery.
      </li>
      <li>A rated practical activity counts as Very Good 3, Good 2, Needs Help 1, out of 3. Digital scores count as recorded, a zero too.</li>
      <li>
        Missing, unfinished and unrated activities are left out of the percent; the &ldquo;activities assessed&rdquo; count shows how much is
        recorded. <b className="font-semibold text-gray-800">Limited coverage</b> means fewer than half are assessed.
      </li>
      <li>Bands: 80% and up Strength shown, 60–79% Developing, below 60% Needs Support. A learner&apos;s highest module is not automatically a strength.</li>
      <li>A skill&apos;s status is your checklist rating only. Activity results are shown beside it as evidence and never change it.</li>
    </ul>
  );
}

function LearnerCard({ learner, rows, quarter }: { learner: Learner; rows: Row[]; quarter: number }) {
  const withResults = learner.modules.filter((m) => m.percent !== null).length;
  const unplaced = learner.entries.filter((e) => e.moduleDomainId === null);

  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:text-gray-400">
        <span className="font-semibold capitalize text-gray-900">{learnerName(learner)}</span>
        <span className="text-xs text-gray-500">
          {withResults === 0 ? "Not yet assessed." : `${withResults} of ${learner.modules.length} modules have results`}
        </span>
      </summary>
      <div className="grid gap-3 border-t border-gray-200 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
        {rows.map((row) => (
          <ModuleTile
            key={row.moduleDomainId}
            label={rowLabel(row)}
            summary={learner.modules.find((m) => m.moduleDomainId === row.moduleDomainId)}
            entries={learner.entries.filter((e) => e.moduleDomainId === row.moduleDomainId)}
            quarter={quarter}
          />
        ))}
        {unplaced.length > 0 && <ModuleTile label="Other skills" entries={unplaced} quarter={quarter} />}
      </div>
    </details>
  );
}

function ModuleTile({ label, summary, entries, quarter }: { label: string; summary?: ModuleSummary; entries: Entry[]; quarter: number }) {
  const skills = entries.filter((e) => e.kind === "skill");
  const activities = entries.filter((e) => e.kind === "activity");

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-bold text-gray-900">{label}</h3>
      {summary && <Performance summary={summary} />}
      {entries.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-sidebar marker:text-gray-400">
            Skills and evidence ({skills.length} skill{skills.length === 1 ? "" : "s"}
            {activities.length > 0 && `, ${activities.length} other activit${activities.length === 1 ? "y" : "ies"}`})
          </summary>
          <div className="mt-2 space-y-3">
            {skills.length > 0 && (
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
                {skills.map((e) => (
                  <SkillRow key={`s-${e.itemId}`} entry={e} quarter={quarter} />
                ))}
              </ul>
            )}
            {activities.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Other activities (no linked skill)</p>
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
                  {activities.map((e) => (
                    <li key={`a-${e.activityId}`} className="space-y-0.5 px-3 py-2">
                      <p className="text-gray-900">{e.activityName}</p>
                      <ResultLine entry={e} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}

function Performance({ summary }: { summary: ModuleSummary }) {
  if (summary.total === 0) return <p className="text-xs text-gray-500">No activities this quarter.</p>;
  const coverage = `${summary.assessed}/${summary.total} ${summary.total === 1 ? "activity" : "activities"} assessed`;
  // Only a reminder of how much is recorded; it does not change the percent or the band.
  const limited = summary.assessed * 2 < summary.total;

  return (
    <div className="space-y-1">
      {summary.percent === null ? (
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Not yet assessed</span> · {coverage}
        </p>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
            <span>Activity performance</span>
            <span
              title={`${summary.earned} of ${summary.possible} points`}
              className={cn(PILL, "text-[13px] font-bold", RESULT_CLASS[scoreBand(summary.percent)])}
            >
              {summary.percent}%
            </span>
            <span>· {coverage}</span>
          </p>
          <p className="text-xs font-semibold text-gray-700">{BAND_LABEL[scoreBand(summary.percent)]}</p>
        </>
      )}
      {limited && (
        <p className="text-xs text-amber-700">
          <span className="font-semibold">Limited coverage</span>: fewer than half of this module&apos;s activities are assessed.
        </p>
      )}
    </div>
  );
}

function SkillRow({ entry, quarter }: { entry: Entry; quarter: number }) {
  const otherQuarter = entry.linkedActivityQuarter !== null && entry.linkedActivityQuarter !== quarter;

  return (
    <li className="space-y-1 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-gray-900">{entry.item}</span>
        {entry.teacherStatus ? (
          <span className={cn(PILL, CHECKLIST_TONE[entry.teacherStatus])}>{CHECKLIST_LABEL[entry.teacherStatus]}</span>
        ) : (
          <span className={cn(PILL, "border border-dashed border-gray-300 text-gray-500")}>Teacher assessment pending</span>
        )}
      </div>
      {entry.checklist && (
        <p className="text-xs text-gray-600">
          Checklist, {dateOf(entry.checklist.at)}
          {entry.checklist.remarks && <> · &ldquo;{entry.checklist.remarks}&rdquo;</>}
        </p>
      )}
      {entry.activityName === null ? (
        <p className="text-xs text-gray-500">No linked activity.</p>
      ) : otherQuarter ? (
        <p className="text-xs text-amber-700">
          Linked activity {entry.activityName} is in Quarter {entry.linkedActivityQuarter}; its result is not used here.
        </p>
      ) : (
        <div className="text-xs text-gray-600">
          <span className="font-semibold text-gray-700">{entry.activityName}</span> (activity evidence) · <ResultLine entry={entry} inline />
        </div>
      )}
    </li>
  );
}

/** One activity's latest result as recorded: digital score and percent in its band, or the practical rating. */
function ResultLine({ entry, inline = false }: { entry: Entry; inline?: boolean }) {
  const r = entry.result;
  let text: ReactNode;
  if (!r) {
    text = "Not done yet";
  } else if (r.score !== null && r.maxScore) {
    const pct = percentOf(r.score, r.maxScore);
    text = (
      <>
        <span className={cn(PILL, RESULT_CLASS[scoreBand(pct)])}>
          {r.score}/{r.maxScore} ({pct}%)
        </span>{" "}
        {dateOf(r.at)}
      </>
    );
  } else if (r.rating) {
    text = (
      <>
        <span className={cn(PILL, RESULT_CLASS[r.rating])}>{PRACTICAL_RESULT_LABEL[r.rating]}</span> practical rating, {dateOf(r.at)}
      </>
    );
  } else {
    text = <span className="text-amber-700">Done, waiting for your rating</span>;
  }
  const remarks = r?.remarks ? <> · &ldquo;{r.remarks}&rdquo;</> : null;
  const played = r ? <span className="text-gray-400"> · played in a Q{r.playedQuarter} class</span> : null;

  return inline ? (
    <>
      {text}
      {remarks}
      {played}
    </>
  ) : (
    <p className="text-xs text-gray-600">
      {text}
      {remarks}
      {played}
    </p>
  );
}
