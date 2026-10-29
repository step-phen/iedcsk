"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronRight, Download, ListChecks, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import SectionSelector, { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import Segmented from "@/app/teacher/_components/shared/segmented";
import { ModalShell } from "@/components/ui/modal-shell";
import type { PracticalResultValue, ScoreBand } from "@/constants/enums";
import type { Section } from "@/types/db";
import { capitalizeWords, hasMiddleName, middleInitial } from "@/lib/learners";
import { useActiveSchoolYear, useActiveSchoolYearFailed } from "@/hooks/useActiveSchoolYear";
import { formatDatePH } from "@/lib/datetime";
import { RESULT_CLASS, percentOf, ratingBand, ratingLabel, scoreBand } from "@/lib/score-band";
import { cn } from "@/lib/utils";
import { downloadStrengthsReport } from "./strengths-pdf";

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
const BAND_LABEL: Record<ScoreBand, string> = {
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

/** One activity's result in words, on the same bands as its color. */
const INTERPRETATION: Record<ScoreBand, string> = {
  very_good: "Good performance",
  good: "Developing",
  needs_help: "Needs more practice",
};

const PILL = "inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums";

/** Solid fills for bars and strips, the same hues as RESULT_CLASS. */
const BAR_CLASS: Record<ScoreBand, string> = {
  very_good: "bg-emerald-500",
  good: "bg-amber-400",
  needs_help: "bg-rose-500",
};

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

export interface ActivityResult {
  activityId: number;
  moduleDomainId: number | null;
  domain: string;
  activity: string;
  skills: string[];
  result: string;
  band: ScoreBand | null;
  /** "Played in a Q2 class" when the game was played during another quarter's class; null otherwise. */
  playedNote: string | null;
}

const playedNote = (playedQuarter: number, quarter: number) => (playedQuarter !== quarter ? `Played in a Q${playedQuarter} class` : null);

/**
 * One row per activity the learner has a result for this quarter, in report-row order. An activity linked to several
 * skills is one row listing them; a skill whose game sits in another quarter is left out, as its tile says.
 */
function activityResults(learner: Learner, rows: Row[], quarter: number): ActivityResult[] {
  const order = rows.map((r) => r.moduleDomainId);
  const rank = (id: number | null) => (id === null ? order.length : order.indexOf(id));
  const out = new Map<number, ActivityResult>();
  for (const e of [...learner.entries].sort((a, b) => rank(a.moduleDomainId) - rank(b.moduleDomainId))) {
    if (e.activityId === null || !e.result) continue;
    if (e.linkedActivityQuarter !== null && e.linkedActivityQuarter !== quarter) continue;
    const seen = out.get(e.activityId);
    if (seen) {
      if (e.item) seen.skills.push(e.item);
      continue;
    }
    const r = e.result;
    const row = rows.find((x) => x.moduleDomainId === e.moduleDomainId);
    const [result, band]: [string, ScoreBand | null] =
      r.score !== null && r.maxScore
        ? [`${r.score}/${r.maxScore}`, scoreBand(percentOf(r.score, r.maxScore))]
        : r.rating
          ? [ratingLabel(r.rating), ratingBand(r.rating)]
          : ["Done, not rated yet", null];
    out.set(e.activityId, {
      activityId: e.activityId,
      moduleDomainId: e.moduleDomainId,
      domain: row ? rowLabel(row) : "Other",
      activity: e.activityName ?? "",
      skills: e.item ? [e.item] : [],
      result,
      band,
      playedNote: playedNote(r.playedQuarter, quarter),
    });
  }
  return [...out.values()];
}

interface InterventionGroup {
  activityId: number;
  domain: string;
  activity: string;
  rated: number;
  learners: { learnerId: number; name: string; result: string }[];
}

/** Every activity at least one learner needs more practice on, with those learners; most learners first. */
function interventionGroups(learners: Learner[], rows: Row[], quarter: number): InterventionGroup[] {
  const groups = new Map<number, InterventionGroup>();
  for (const l of learners) {
    for (const r of activityResults(l, rows, quarter)) {
      if (!r.band) continue;
      let g = groups.get(r.activityId);
      if (!g) groups.set(r.activityId, (g = { activityId: r.activityId, domain: r.domain, activity: r.activity, rated: 0, learners: [] }));
      g.rated++;
      if (r.band === "needs_help") g.learners.push({ learnerId: l.learnerId, name: learnerName(l), result: r.result });
    }
  }
  return [...groups.values()].filter((g) => g.learners.length > 0).sort((a, b) => b.learners.length - a.learners.length);
}

export default function StrengthsReport({
  sections,
  sectionId,
  report,
  teacherName,
}: {
  sections: Section[];
  sectionId: number | null;
  report: StrengthsData | null;
  teacherName: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const quarter = report?.quarter ?? 1;
  const year = useActiveSchoolYear();
  const yearFailed = useActiveSchoolYearFailed();
  const section = sections.find((s) => s.sectionId === sectionId);
  // What every learner's PDF carries besides the learner; null until the school year has loaded.
  // A failed school-year load still allows the PDF, with "-" for the year, instead of a button stuck on loading.
  const pdfMeta =
    (year === undefined && !yearFailed) || !section
      ? null
      : { section: `${section.gradeLevel} - ${section.sectionName}`, schoolYear: year?.name ?? "-", teacherName, quarter };

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
          // Keyed by section so a new section never shows the old one's learners; a quarter change keeps the picked learner. Dimmed while it loads.
          <div
            key={sectionId}
            className={cn("space-y-3 animate-in fade-in duration-200 motion-reduce:animate-none transition-opacity", isPending && "opacity-50")}
          >
            <InterventionPlan groups={interventionGroups(report.learners, report.rows, quarter)} />
            {report.learners.length === 0 ? (
              <Empty heading="No learners yet" message="Add learners to this section on the Learners page." />
            ) : learners.length === 0 ? (
              <Empty heading="No learner matches your search" message="Check the spelling, or clear the search." />
            ) : (
              <LearnerProfiles learners={learners} rows={report.rows} quarter={quarter} pdfMeta={pdfMeta} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Class-wide: who needs more practice on which activity, so re-teaching can be planned per group. */
function InterventionPlan({ groups }: { groups: InterventionGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <details open className="rounded-lg border border-rose-200 bg-rose-50/50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-rose-800 marker:text-rose-400">
        Intervention planning: {groups.length} activit{groups.length === 1 ? "y has" : "ies have"} learners needing more practice
      </summary>
      <ul className="grid gap-3 border-t border-rose-200 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
        {groups.map((g) => (
          <li key={g.activityId} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <div>
              <p className="text-xs text-gray-500">{g.domain}</p>
              <p className="font-semibold text-gray-900">{g.activity}</p>
              <p className="text-xs text-rose-700">
                {g.learners.length} of {g.rated} rated learner{g.rated === 1 ? "" : "s"} need{g.learners.length === 1 ? "s" : ""} more practice
              </p>
            </div>
            <ul className="space-y-1 text-sm">
              {g.learners.map((l) => (
                <li key={l.learnerId} className="flex items-center justify-between gap-2">
                  <span className="capitalize text-gray-800">{l.name}</span>
                  <span className={cn(PILL, RESULT_CLASS.needs_help)}>{l.result}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
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

type PdfMeta = { section: string; schoolYear: string; teacherName: string | null; quarter: number };

/** The learner list beside one learner's profile, so the teacher reads one child at a time instead of a stack of cards. */
function LearnerProfiles({ learners, rows, quarter, pdfMeta }: { learners: Learner[]; rows: Row[]; quarter: number; pdfMeta: PdfMeta | null }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // A search that hides the picked learner falls back to the first match.
  const selected = learners.find((l) => l.learnerId === selectedId) ?? learners[0];
  if (!selected) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav
        aria-label="Learners"
        className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200 p-1.5 lg:max-h-[40rem] lg:self-start"
      >
        {learners.map((l) => {
          const on = l.learnerId === selected.learnerId;
          const need = l.modules.filter((m) => m.percent !== null && scoreBand(m.percent) === "needs_help").length;
          return (
            <button
              key={l.learnerId}
              type="button"
              aria-current={on ? "true" : undefined}
              onClick={() => {
                setSelectedId(l.learnerId);
                // Stacked on small screens, the profile sits below the list; bring it into view.
                if (window.matchMedia("(max-width: 1023px)").matches) profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#5b0610]/40",
                on && "bg-rose-50 hover:bg-rose-50",
              )}
            >
              <span className="flex items-center justify-between gap-2 text-[13px]">
                <span className={cn("capitalize", on ? "font-bold text-[#5b0610]" : "font-semibold text-gray-800")}>{learnerName(l)}</span>
                {need > 0 && (
                  <span className={cn(PILL, RESULT_CLASS.needs_help)} title={`${need} module${need === 1 ? " needs" : "s need"} support`}>
                    {need}
                  </span>
                )}
              </span>
              <ModuleStrip modules={l.modules} />
            </button>
          );
        })}
      </nav>
      <div ref={profileRef} className="min-w-0 scroll-mt-36">
        <LearnerProfile key={selected.learnerId} learner={selected} rows={rows} quarter={quarter} pdfMeta={pdfMeta} />
      </div>
    </div>
  );
}

/** What each bar color means, on the Classroom Record cut-offs; shown in the page's title row. */
export function BandKey() {
  const keys = [
    { color: BAR_CLASS.very_good, label: "80% and up · Strength shown" },
    { color: BAR_CLASS.good, label: "60–79% · Developing" },
    { color: BAR_CLASS.needs_help, label: "Below 60% · Needs Support" },
    { color: "bg-gray-200", label: "No result yet · Not yet assessed" },
  ];
  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-1 rounded-lg border border-stone-300/70 bg-white/60 px-3 py-2 text-[11px] text-gray-600 sm:grid-cols-2">
      <li className="font-semibold text-gray-700 sm:col-span-2">Each bar is one module</li>
      {keys.map((k) => (
        <li key={k.label} className="flex items-center gap-2">
          <span className={cn("h-1.5 w-5 shrink-0 rounded-sm", k.color)} aria-hidden="true" />
          {k.label}
        </li>
      ))}
    </ul>
  );
}

/** One segment per module row in report order, colored by its band; gray until assessed. */
function ModuleStrip({ modules }: { modules: ModuleSummary[] }) {
  if (modules.length === 0) return null;
  return (
    <span className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }} aria-hidden="true">
      {modules.map((m) => (
        <span key={m.moduleDomainId} className={cn("h-1.5 rounded-sm", m.percent === null ? "bg-gray-200" : BAR_CLASS[scoreBand(m.percent)])} />
      ))}
    </span>
  );
}

function LearnerProfile({ learner, rows, quarter, pdfMeta }: { learner: Learner; rows: Row[]; quarter: number; pdfMeta: PdfMeta | null }) {
  const [exporting, setExporting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsId = useId();
  const withResults = learner.modules.filter((m) => m.percent !== null).length;
  const unplaced = learner.entries.filter((e) => e.moduleDomainId === null);
  const results = activityResults(learner, rows, quarter);

  // Module rows with a percent, split on the same bands as the Classroom Record.
  const rated = rows.flatMap((row) => {
    const summary = learner.modules.find((m) => m.moduleDomainId === row.moduleDomainId);
    return summary && summary.percent !== null ? [{ row, summary, percent: summary.percent }] : [];
  });
  const strong = rated.filter((x) => scoreBand(x.percent) === "very_good").sort((a, b) => b.percent - a.percent);
  const weak = rated.filter((x) => scoreBand(x.percent) === "needs_help").sort((a, b) => a.percent - b.percent);
  const weakIds = new Set(weak.map((x) => x.row.moduleDomainId));
  // A low activity in a module that is not itself below 60% still needs practice; list it under the weak modules.
  const otherLow = results.filter((r) => r.band === "needs_help" && (r.moduleDomainId === null || !weakIds.has(r.moduleDomainId)));

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Quarter {quarter}</p>
          <h2 className="text-lg font-bold capitalize text-gray-900">{learnerName(learner)}</h2>
          <p className="text-xs text-gray-600">
            {withResults === 0
              ? "Not yet assessed."
              : `${withResults} of ${learner.modules.length} modules have results · ${strong.length} strength${strong.length === 1 ? "" : "s"} shown · ${weak.length} need${weak.length === 1 ? "s" : ""} support`}
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#5b0610] px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610]/40"
            >
              <ListChecks size={14} aria-hidden="true" />
              All activity results ({results.length})
            </button>
            <button
              type="button"
              disabled={!pdfMeta || exporting}
              onClick={async () => {
                if (!pdfMeta) return;
                setExporting(true);
                try {
                  await downloadStrengthsReport({
                    ...pdfMeta,
                    learnerName: capitalizeWords([learner.firstName, middleInitial(learner.middleName), learner.lastName, learner.extensionName].filter(Boolean).join(" ")),
                    results,
                    interpretation: (r) => (r.band ? INTERPRETATION[r.band] : "Waiting for rating"),
                  });
                } catch (err) {
                  console.error("Failed to generate the strengths PDF:", err);
                  toast.error("Couldn't make the PDF. Please try again.");
                } finally {
                  setExporting(false);
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#5b0610] px-3 py-1.5 text-xs font-semibold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610]/40 disabled:cursor-wait disabled:opacity-60"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
              Download PDF
            </button>
          </div>
        )}
      </header>

      {withResults > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <section className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <h3 className="text-[13px] font-bold text-emerald-800">Strengths ({strong.length})</h3>
            {strong.length > 0 ? (
              <ul className="space-y-2">
                {strong.map((x) => (
                  <ModuleHighlight key={x.row.moduleDomainId} label={rowLabel(x.row)} summary={x.summary} percent={x.percent} />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-600">No module at 80% or above yet. The highest module is not automatically a strength.</p>
            )}
          </section>
          <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
            <h3 className="text-[13px] font-bold text-rose-800">Needs support ({weak.length})</h3>
            {weak.length > 0 && (
              <ul className="space-y-2">
                {weak.map((x) => (
                  <ModuleHighlight key={x.row.moduleDomainId} label={rowLabel(x.row)} summary={x.summary} percent={x.percent} />
                ))}
              </ul>
            )}
            {otherLow.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-rose-800">{weak.length > 0 ? "Also needs more practice" : "Activities needing more practice"}</p>
                <ul className="space-y-0.5 text-xs text-rose-900">
                  {otherLow.map((r) => (
                    <li key={r.activityId}>
                      <span className="text-rose-700">{r.domain}</span> – <span className="font-semibold">{r.activity}</span> · {r.result}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weak.length === 0 && otherLow.length === 0 && <p className="text-xs text-gray-600">No module below 60% and no activity needing more practice.</p>}
          </section>
        </div>
      )}

      <section>
        <h3 className="text-[13px] font-bold text-gray-900">All modules</h3>
        <div>
          {rows.map((row) => (
            <ModuleRow
              key={row.moduleDomainId}
              learner={learnerName(learner)}
              label={rowLabel(row)}
              summary={learner.modules.find((m) => m.moduleDomainId === row.moduleDomainId)}
              entries={learner.entries.filter((e) => e.moduleDomainId === row.moduleDomainId)}
              quarter={quarter}
            />
          ))}
          {unplaced.length > 0 && <ModuleRow learner={learnerName(learner)} label="Other skills" entries={unplaced} quarter={quarter} />}
        </div>
        <p className="pt-2 text-[11px] text-gray-500">Tick marks on each bar sit at 60% and 80%. Click a module to see its skills and evidence.</p>
      </section>

      <ModalShell
        open={showResults}
        onClose={() => setShowResults(false)}
        title={`All activity results (${results.length})`}
        subtitle={`${capitalizeWords(learnerName(learner))} · Quarter ${quarter}`}
        headerId={resultsId}
        maxWidth="max-w-3xl"
        titleSize="text-base"
        headerPadding="px-5 py-3"
        panelClassName="max-h-[85vh] max-h-[85dvh] flex flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <ResultsTable results={results} />
        </div>
      </ModalShell>
    </article>
  );
}

/** One module in the Strengths or Needs support box: its percent and coverage. */
function ModuleHighlight({ label, summary, percent }: { label: string; summary: ModuleSummary; percent: number }) {
  return (
    <li className="space-y-0.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="font-semibold text-gray-900">{label}</span>
        <span title={`${summary.earned} of ${summary.possible} points`} className={cn(PILL, RESULT_CLASS[scoreBand(percent)])}>
          {percent}%
        </span>
        <span className="text-[11px] text-gray-500">
          {summary.assessed}/{summary.total} assessed
        </span>
      </p>
    </li>
  );
}

function ResultsTable({ results }: { results: ActivityResult[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[32rem] text-left text-[13px]">
        <thead className="bg-gray-50 text-xs font-bold text-gray-700">
          <tr>
            <th className="px-3 py-2">Domain / Activity</th>
            <th className="px-3 py-2 text-center">Result</th>
            <th className="px-3 py-2">Interpretation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {results.map((r) => (
            <tr key={r.activityId} className="align-top">
              <td className="px-3 py-2">
                <p className="text-xs text-gray-500">{r.domain}</p>
                <p className="font-semibold text-gray-900">{r.activity}</p>
                {r.skills.length > 0 && <p className="text-xs text-gray-600">Skill: {r.skills.join("; ")}</p>}
              </td>
              <td className="px-3 py-2 text-center">
                <span className={cn(PILL, r.band ? RESULT_CLASS[r.band] : "bg-gray-100 text-gray-600")}>{r.result}</span>
                {r.playedNote && <p className="mt-1 text-[11px] text-gray-500">{r.playedNote}</p>}
              </td>
              <td className={cn("px-3 py-2 font-semibold", r.band === "needs_help" ? "text-rose-700" : "text-gray-800")}>
                {r.band ? INTERPRETATION[r.band] : "Waiting for your rating"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One module: coverage, a bar with ticks at the 60% and 80% cut-offs, and the percent; a click opens its skills and evidence in a modal. */
function ModuleRow({
  learner,
  label,
  summary,
  entries,
  quarter,
}: {
  learner: string;
  label: string;
  summary?: ModuleSummary;
  entries: Entry[];
  quarter: number;
}) {
  const [open, setOpen] = useState(false);
  const headerId = useId();
  const skills = entries.filter((e) => e.kind === "skill");
  const activities = entries.filter((e) => e.kind === "activity");
  const [filter, setFilter] = useState<SkillFilter>("all");
  const shown = filter === "all" ? skills : skills.filter((e) => skillFilter(e) === filter);
  const rated = skills.filter((e) => e.teacherStatus).length;
  const band = summary?.percent != null ? scoreBand(summary.percent) : null;
  // Only a reminder of how much is recorded; it does not change the percent or the band.
  const limited = summary !== undefined && summary.assessed * 2 < summary.total;

  const head = (
    <div className="grid grid-cols-[minmax(0,1fr)_5rem_3.5rem_1rem] items-center gap-3 py-2 sm:grid-cols-[minmax(0,1fr)_10rem_3.5rem_1rem]">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-gray-900">{label}</span>
        <span className="block text-[11px] text-gray-500">
          {!summary
            ? `${skills.length} skill${skills.length === 1 ? "" : "s"}`
            : summary.total === 0
              ? "No activities this quarter"
              : `${summary.assessed}/${summary.total} assessed`}
          {limited && <span className="font-semibold text-amber-700"> · limited coverage</span>}
        </span>
      </span>
      {summary ? (
        <span className="relative h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          {band && summary.percent !== null && (
            <span className={cn("absolute inset-y-0 left-0 rounded-full", BAR_CLASS[band])} style={{ width: `${summary.percent}%` }} />
          )}
          <span className="absolute inset-y-0 left-[60%] w-px bg-white" />
          <span className="absolute inset-y-0 left-[80%] w-px bg-white" />
        </span>
      ) : (
        <span />
      )}
      <span className="justify-self-end">
        {summary &&
          (band && summary.percent !== null ? (
            <span title={`${summary.earned} of ${summary.possible} points · ${BAND_LABEL[band]}`} className={cn(PILL, RESULT_CLASS[band])}>
              {summary.percent}%
            </span>
          ) : (
            <span title="Not yet assessed" className={cn(PILL, "bg-gray-100 text-gray-500")}>
              —
            </span>
          ))}
      </span>
      {entries.length > 0 ? (
        <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
      ) : (
        <span />
      )}
    </div>
  );

  if (entries.length === 0) return <div className="border-b border-gray-300 last:border-b-0">{head}</div>;
  return (
    <div className="border-b border-gray-300 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-md px-2 text-left outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#5b0610]/40"
      >
        {head}
      </button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`${capitalizeWords(learner)} · Quarter ${quarter}`}
        headerId={headerId}
        maxWidth="max-w-3xl"
        titleSize="text-base"
        headerPadding="px-5 py-3"
        panelClassName="max-h-[85vh] max-h-[85dvh] flex flex-col"
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 text-[13px] leading-snug sm:p-5">
          {summary && (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Activity performance">
                {band && summary.percent !== null ? (
                  <>
                    <span className={cn("text-lg font-bold tabular-nums", BAND_TEXT[band])}>{summary.percent}%</span>
                    <span className="block text-[11px] text-gray-500">
                      {BAND_LABEL[band]} · {summary.earned}/{summary.possible} pts
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold text-gray-400">—</span>
                    <span className="block text-[11px] text-gray-500">Not yet assessed</span>
                  </>
                )}
              </Stat>
              <Stat label="Activities done">
                <span className="text-lg font-bold tabular-nums text-gray-900">
                  {summary.assessed}
                  <span className="text-sm font-semibold text-gray-400">/{summary.total}</span>
                </span>
                <span className={cn("block text-[11px]", limited ? "font-semibold text-amber-700" : "text-gray-500")}>
                  {limited ? "Limited coverage" : "assessed"}
                </span>
              </Stat>
              <Stat label="Skills you rated">
                <span className="text-lg font-bold tabular-nums text-gray-900">
                  {rated}
                  <span className="text-sm font-semibold text-gray-400">/{skills.length}</span>
                </span>
                <span className="block text-[11px] text-gray-500">{skills.length - rated === 0 ? "All rated" : `${skills.length - rated} not rated yet`}</span>
              </Stat>
            </div>
          )}

          {skills.length > 0 && (
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Skills</h3>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter skills by your rating">
                  {SKILL_FILTERS.map(({ value, label: chip }) => {
                    const count = value === "all" ? skills.length : skills.filter((e) => skillFilter(e) === value).length;
                    if (count === 0 && value !== "all") return null;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5b0610]/40",
                          filter === value ? "border-[#5b0610] bg-[#5b0610] text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
                        )}
                      >
                        {chip} {count}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_8rem] gap-3 bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-500 sm:grid">
                  <span>Skill and activity</span>
                  <span>Activity result</span>
                  <span>Your rating</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {shown.map((e) => (
                    <EvidenceRow
                      key={`s-${e.itemId}`}
                      title={e.item ?? ""}
                      detail={e.activityName ?? "No activity linked"}
                      remarks={[e.checklist?.remarks, e.result?.remarks]}
                      result={<ResultBadge entry={e} quarter={quarter} />}
                      rating={<RatingBadge entry={e} />}
                    />
                  ))}
                </ul>
                {shown.length === 0 && <p className="px-3 py-4 text-center text-xs text-gray-500">No skill has this rating.</p>}
              </div>
            </section>
          )}

          {activities.length > 0 && (
            <section className="space-y-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Other activities</h3>
                <p className="text-[11px] text-gray-500">Not linked to a checklist skill, but still counted in the activity performance.</p>
              </div>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                {activities.map((e) => (
                  <EvidenceRow
                    key={`a-${e.activityId}`}
                    title={e.activityName ?? ""}
                    remarks={[e.result?.remarks]}
                    result={<ResultBadge entry={e} quarter={quarter} />}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </ModalShell>
    </div>
  );
}

const BAND_TEXT: Record<ScoreBand, string> = {
  very_good: "text-emerald-700",
  good: "text-amber-700",
  needs_help: "text-rose-700",
};

type SkillFilter = ChecklistRating | "pending" | "all";

const SKILL_FILTERS: { value: SkillFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_support", label: "Needs Support" },
  { value: "developing", label: "Developing" },
  { value: "achieved", label: "Achieved" },
  { value: "not_yet_observed", label: "Not yet observed" },
  { value: "pending", label: "Not rated" },
];

const skillFilter = (e: Entry): SkillFilter => e.teacherStatus ?? "pending";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      {children}
    </div>
  );
}

/** One skill or activity: its name and linked game on the left, the result and your rating in their own columns. */
function EvidenceRow({
  title,
  detail,
  remarks,
  result,
  rating,
}: {
  title: string;
  detail?: string;
  remarks: (string | null | undefined)[];
  result: ReactNode;
  rating?: ReactNode;
}) {
  const notes = remarks.filter(Boolean);
  return (
    <li className="flex flex-col gap-1.5 px-3 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_7.5rem_8rem] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        {detail && <p className="text-[11px] text-gray-500">{detail}</p>}
        {notes.map((n, i) => (
          // The checklist and result remarks can be the same text, so the position is the key.
          <p key={i} className="text-[11px] italic text-gray-600">
            &ldquo;{n}&rdquo;
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:contents">
        <div>{result}</div>
        {rating && <div>{rating}</div>}
      </div>
    </li>
  );
}

/** The linked game's latest result this quarter, on the same bands as everywhere else; the date shows on hover. */
function ResultBadge({ entry, quarter }: { entry: Entry; quarter: number }) {
  if (entry.activityName === null) return <span className="text-[11px] text-gray-400">—</span>;
  if (entry.linkedActivityQuarter !== null && entry.linkedActivityQuarter !== quarter)
    return (
      <span className="text-[11px] text-amber-700" title={`This game is in Quarter ${entry.linkedActivityQuarter}; its result is not used here.`}>
        Game is in Q{entry.linkedActivityQuarter}
      </span>
    );
  const r = entry.result;
  if (!r) return <span className="text-[11px] text-gray-400">Not done yet</span>;
  const note = playedNote(r.playedQuarter, quarter);
  let badge: ReactNode;
  if (r.score !== null && r.maxScore) {
    const pct = percentOf(r.score, r.maxScore);
    badge = (
      <span title={`${pct}% · ${dateOf(r.at)}`} className={cn(PILL, RESULT_CLASS[scoreBand(pct)])}>
        {r.score}/{r.maxScore}
      </span>
    );
  } else if (r.rating) {
    badge = (
      <span title={`Practical rating · ${dateOf(r.at)}`} className={cn(PILL, RESULT_CLASS[ratingBand(r.rating)])}>
        {ratingLabel(r.rating)}
      </span>
    );
  } else {
    badge = <span className={cn(PILL, "bg-amber-50 text-amber-700")}>Needs your rating</span>;
  }
  if (!note) return badge;
  return (
    <span className="flex flex-col items-start gap-0.5">
      {badge}
      <span className="text-[11px] text-gray-500">{note}</span>
    </span>
  );
}

/** Your checklist rating, the skill's only status; the date shows on hover. */
function RatingBadge({ entry }: { entry: Entry }) {
  if (!entry.teacherStatus) return <span className={cn(PILL, "border border-dashed border-gray-300 text-gray-500")}>Not rated</span>;
  return (
    <span title={entry.checklist ? `Rated ${dateOf(entry.checklist.at)}` : undefined} className={cn(PILL, CHECKLIST_TONE[entry.teacherStatus])}>
      {CHECKLIST_LABEL[entry.teacherStatus]}
    </span>
  );
}
