"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { CircleCheck, CircleDashed, Download, EyeOff, FileText, Gamepad2, Info, LifeBuoy, Loader2, TrendingUp, type LucideIcon } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RATING_BADGE, type Rating } from "@/app/teacher/developmental-checklist/_components/checklist-table";
import { cn } from "@/lib/utils";
import { downloadChecklistSummary, type ChecklistSummaryLearner } from "./export-checklist-summary";

export type ProgressItem = {
  itemId: number;
  item: string;
  quarter: number;
  domainId: number;
  domainName: string;
  activityName: string | null;
  rating: Rating | null;
};

/** A skill's rating, or "unrated" while the teacher has not rated it yet. */
type Status = Rating | "unrated";

const QUARTERS = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

const STATUS: Record<Status, { label: string; meaning: string; icon: LucideIcon; pill: string; dot: string; stroke: string }> = {
  achieved: { label: RATING_BADGE.achieved.label, meaning: "Can do this on their own.", icon: CircleCheck, pill: RATING_BADGE.achieved.className, dot: "bg-emerald-500", stroke: "stroke-emerald-500" },
  developing: { label: RATING_BADGE.developing.label, meaning: "Getting there, but still needs practice.", icon: TrendingUp, pill: RATING_BADGE.developing.className, dot: "bg-amber-500", stroke: "stroke-amber-500" },
  needs_support: { label: RATING_BADGE.needs_support.label, meaning: "Needs extra help to do this.", icon: LifeBuoy, pill: RATING_BADGE.needs_support.className, dot: "bg-red-500", stroke: "stroke-red-500" },
  not_yet_observed: { label: RATING_BADGE.not_yet_observed.label, meaning: "The teacher has not seen this skill yet.", icon: EyeOff, pill: RATING_BADGE.not_yet_observed.className, dot: "bg-gray-400", stroke: "stroke-gray-400" },
  unrated: { label: "Not rated yet", meaning: "No rating has been given yet.", icon: CircleDashed, pill: "border-dashed border-gray-300 bg-white text-gray-600", dot: "bg-gray-200", stroke: "stroke-white" },
};
const STATUS_ORDER = Object.keys(STATUS) as Status[];

const statusOf = (item: ProgressItem): Status => item.rating ?? "unrated";

const countsOf = (list: ProgressItem[]) =>
  Object.fromEntries(STATUS_ORDER.map((s) => [s, list.filter((i) => statusOf(i) === s).length])) as Record<Status, number>;

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Donut of rated skills, one arc per rating; the white track left over is the unrated part. */
function RatingRing({ counts, total, size, thickness, label, className }: { counts: Record<Status, number>; total: number; size: number; thickness: number; label: string; className?: string }) {
  const r = (size - thickness) / 2;
  const arcs = STATUS_ORDER.filter((s) => s !== "unrated" && counts[s] > 0).map((s) => ({ s, length: (counts[s] / total) * 100 }));
  const starts = arcs.map((_, i) => arcs.slice(0, i).reduce((sum, a) => sum + a.length, 0));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-white" />
        {arcs.map((arc, i) => (
          <circle
            key={arc.s}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            pathLength={100}
            strokeDasharray={`${arc.length} 100`}
            strokeDashoffset={-starts[i]}
            className={cn(STATUS[arc.s].stroke, "transition-[stroke-dasharray] duration-500 motion-reduce:transition-none")}
          />
        ))}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-bold tabular-nums text-gray-900">
        {label}
      </span>
    </div>
  );
}

/** The learner's Developmental Checklist ratings, one quarter at a time, grouped by domain. */
export default function ProgressTab({
  items,
  learnerName,
  learner,
  reportHref,
}: {
  items: ProgressItem[];
  learnerName: string;
  /** Header of the Checklist Summary PDF. */
  learner: ChecklistSummaryLearner;
  /** Progress Report page with this learner picked; null when the learner has no section. */
  reportHref: string | null;
}) {
  // Opens on the latest quarter that has a rating, else the first quarter that has skills.
  const latestRated = Math.max(0, ...items.filter((i) => i.rating).map((i) => i.quarter));
  const [quarter, setQuarter] = useState(String(latestRated || items[0]?.quarter || 1));
  // The domain whose skills the modal lists; kept after closing so the modal's closing animation still has content.
  const [domainId, setDomainId] = useState<number | null>(null);
  const [domainOpen, setDomainOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const shown = items.filter((i) => String(i.quarter) === quarter);
  const counts = countsOf(shown);
  const rated = shown.length - counts.unrated;
  const quarterDomains = shown.reduce<{ domainId: number; domainName: string; skills: ProgressItem[] }[]>((groups, item) => {
    const group = groups.find((g) => g.domainId === item.domainId);
    if (group) group.skills.push(item);
    else groups.push({ domainId: item.domainId, domainName: item.domainName, skills: [item] });
    return groups;
  }, []);
  const pickedDomain = quarterDomains.find((d) => d.domainId === domainId);
  const pickedCounts = pickedDomain && countsOf(pickedDomain.skills);

  async function exportSummary() {
    setExporting(true);
    try {
      await downloadChecklistSummary({ learner, firstName: learnerName, quarter: Number(quarter), items: shown });
    } catch (err) {
      console.error("Failed to generate the checklist summary PDF:", err);
      toast.error("Couldn't make the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }


  return (
    <div className="space-y-6 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={quarter}
          onValueChange={(v) => {
            setQuarter(String(v));
          }}
        >
          <TabsList variant="line" className="min-w-0 overflow-x-auto scrollbar-hide">
            {QUARTERS.map((name, i) => (
              <TabsTrigger
                key={name}
                value={String(i + 1)}
                className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-600 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={exportSummary}
            disabled={exporting || shown.length === 0}
            title={shown.length === 0 ? "No checklist skills for this quarter" : `Download the ${QUARTERS[Number(quarter) - 1]} checklist summary as a PDF`}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#5b0610] px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            Checklist Summary
          </button>
          {/* Opens the Progress Report for the quarter picked here. */}
          {reportHref && (
            <Link
              href={`${reportHref}&quarter=${quarter}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none transition-colors hover:border-[#5b0610] hover:text-[#5b0610] focus-visible:ring-2 focus-visible:ring-[#5b0610]/40"
            >
              <FileText size={15} aria-hidden="true" />
              Progress Report
            </Link>
          )}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-gray-800">No checklist skills for this quarter yet.</p>
          <p className="mt-1 text-sm text-gray-600">They appear here once skills are added to the Developmental Checklist.</p>
        </div>
      ) : (
        <>
          <section aria-label="Quarter summary" className="space-y-4 rounded-xl bg-[#f6f1df] p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div role="img" aria-label={STATUS_ORDER.filter((s) => counts[s]).map((s) => `${STATUS[s].label}: ${counts[s]}`).join(", ")}>
                <RatingRing counts={counts} total={shown.length} size={112} thickness={13} label={`${percent(counts.achieved, shown.length)}%`} className="text-2xl" />
              </div>
              <div className="min-w-0 flex-1 basis-56 space-y-1">
                <p className="text-base font-bold text-gray-900">
                  {learnerName} has achieved {counts.achieved} of {shown.length} {shown.length === 1 ? "skill" : "skills"}
                </p>
                <p className="text-sm text-gray-700">
                  {rated === 0
                    ? "No skills have been rated for this quarter yet."
                    : `${rated} rated so far, ${counts.unrated} still waiting for a rating.`}
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5 text-sm text-gray-700">
                  {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
                    <li key={s} className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className={cn("size-2.5 rounded-full", STATUS[s].dot, s === "unrated" && "border border-gray-400")} />
                      {STATUS[s].label}
                      <span className="font-semibold tabular-nums text-gray-900">{counts[s]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Tap a domain to see its skills</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5">
                {quarterDomains.map((domain) => {
                  const domainCount = countsOf(domain.skills);
                  return (
                    <button
                      key={domain.domainId}
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        setDomainId(domain.domainId);
                        setDomainOpen(true);
                      }}
                      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-white/60 px-2.5 py-3 text-center outline-none transition-colors hover:border-[#5b0610]/40 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#5b0610]/40"
                    >
                      <RatingRing counts={domainCount} total={domain.skills.length} size={64} thickness={8} label={`${percent(domainCount.achieved, domain.skills.length)}%`} className="text-sm" />
                      <span className="text-xs font-semibold leading-snug text-gray-900">{domain.domainName}</span>
                      <span className="text-xs tabular-nums text-gray-600">
                        {domainCount.achieved} of {domain.skills.length} achieved
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <details className="group text-sm text-gray-700">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold text-[#5b0610] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#5b0610]/40 [&::-webkit-details-marker]:hidden">
                <Info size={15} aria-hidden="true" />
                What do these ratings mean?
              </summary>
              <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {STATUS_ORDER.map((s) => (
                  <div key={s}>
                    <dt className="font-semibold text-gray-900">{STATUS[s].label}</dt>
                    <dd>{STATUS[s].meaning}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        </>
      )}

      <ModalShell
        open={domainOpen && !!pickedDomain}
        onClose={() => setDomainOpen(false)}
        title={pickedDomain?.domainName ?? ""}
        subtitle={pickedDomain && pickedCounts ? `${QUARTERS[Number(quarter) - 1]} · ${pickedCounts.achieved} of ${pickedDomain.skills.length} achieved` : undefined}
        headerId="progress-domain-modal"
        panelClassName="flex max-h-[calc(100dvh-3rem)] flex-col"
      >
        {pickedDomain && pickedCounts && (
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 bg-[#f6f1df] px-6 py-4">
              <RatingRing counts={pickedCounts} total={pickedDomain.skills.length} size={64} thickness={8} label={`${percent(pickedCounts.achieved, pickedDomain.skills.length)}%`} className="text-sm" />
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-700">
                {STATUS_ORDER.filter((s) => pickedCounts[s]).map((s) => (
                  <li key={s} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={cn("size-2.5 rounded-full", STATUS[s].dot, s === "unrated" && "border border-gray-400")} />
                    {STATUS[s].label}
                    <span className="font-semibold tabular-nums text-gray-900">{pickedCounts[s]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-h-0 overflow-y-auto px-6 pb-2">
              <SkillList skills={pickedDomain.skills} />
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}

function SkillList({ skills }: { skills: ProgressItem[] }) {
  return (
    <ul className="divide-y divide-gray-100">
      {skills.map((skill) => {
        const status = STATUS[statusOf(skill)];
        const Icon = status.icon;
        return (
          <li key={skill.itemId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5">
            <div className="min-w-0 flex-1 space-y-1 basis-64">
              <p className="text-[15px] font-semibold text-gray-900">{skill.item}</p>
              {skill.activityName && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Gamepad2 size={14} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                  <span>Activity: {skill.activityName}</span>
                </p>
              )}
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold", status.pill)}>
              <Icon size={15} aria-hidden="true" />
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
