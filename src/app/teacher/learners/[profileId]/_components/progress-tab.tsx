"use client";

import { useState } from "react";
import { CircleCheck, CircleDashed, EyeOff, Gamepad2, Info, LifeBuoy, TrendingUp, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RATING_BADGE, type Rating } from "@/app/teacher/developmental-checklist/_components/checklist-table";
import { cn } from "@/lib/utils";

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

const STATUS: Record<Status, { label: string; meaning: string; icon: LucideIcon; pill: string; dot: string }> = {
  achieved: { label: RATING_BADGE.achieved.label, meaning: "Can do this on their own.", icon: CircleCheck, pill: RATING_BADGE.achieved.className, dot: "bg-emerald-500" },
  developing: { label: RATING_BADGE.developing.label, meaning: "Getting there, but still needs practice.", icon: TrendingUp, pill: RATING_BADGE.developing.className, dot: "bg-amber-500" },
  needs_support: { label: RATING_BADGE.needs_support.label, meaning: "Needs extra help to do this.", icon: LifeBuoy, pill: RATING_BADGE.needs_support.className, dot: "bg-red-500" },
  not_yet_observed: { label: RATING_BADGE.not_yet_observed.label, meaning: "The teacher has not seen this skill yet.", icon: EyeOff, pill: RATING_BADGE.not_yet_observed.className, dot: "bg-gray-400" },
  unrated: { label: "Not rated yet", meaning: "No rating has been given yet.", icon: CircleDashed, pill: "border-dashed border-gray-300 bg-white text-gray-600", dot: "bg-gray-200" },
};
const STATUS_ORDER = Object.keys(STATUS) as Status[];

const statusOf = (item: ProgressItem): Status => item.rating ?? "unrated";

/** The learner's Developmental Checklist ratings, one quarter at a time, grouped by domain. */
export default function ProgressTab({ items, learnerName }: { items: ProgressItem[]; learnerName: string }) {
  // Opens on the latest quarter that has a rating, else the first quarter that has skills.
  const latestRated = Math.max(0, ...items.filter((i) => i.rating).map((i) => i.quarter));
  const [quarter, setQuarter] = useState(String(latestRated || items[0]?.quarter || 1));
  const [filter, setFilter] = useState<Status | "all">("all");

  const shown = items.filter((i) => String(i.quarter) === quarter);
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, shown.filter((i) => statusOf(i) === s).length])) as Record<Status, number>;
  const rated = shown.length - counts.unrated;
  // A filter with nothing in it after switching quarters falls back to showing everything.
  const activeFilter = filter === "all" || counts[filter] > 0 ? filter : "all";
  const visible = activeFilter === "all" ? shown : shown.filter((i) => statusOf(i) === activeFilter);

  const domains = visible.reduce<{ domainId: number; domainName: string; skills: ProgressItem[] }[]>((groups, item) => {
    const group = groups.find((g) => g.domainId === item.domainId);
    if (group) group.skills.push(item);
    else groups.push({ domainId: item.domainId, domainName: item.domainName, skills: [item] });
    return groups;
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-5">
      <Tabs
        value={quarter}
        onValueChange={(v) => {
          setQuarter(String(v));
          setFilter("all");
        }}
      >
        <TabsList variant="line" className="min-w-0 overflow-x-auto scrollbar-hide">
          {QUARTERS.map((name, i) => {
            const inQuarter = items.filter((item) => item.quarter === i + 1);
            const ratedInQuarter = inQuarter.filter((item) => item.rating).length;
            return (
              <TabsTrigger
                key={name}
                value={String(i + 1)}
                className="gap-2 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-gray-600 data-active:text-[#4a0e1c] after:bg-[#4a0e1c]"
              >
                {name}
                {inQuarter.length > 0 && (
                  <span className="text-xs font-medium tabular-nums text-gray-500">
                    {ratedInQuarter}/{inQuarter.length}
                    <span className="sr-only"> skills rated</span>
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-gray-800">No checklist skills for this quarter yet.</p>
          <p className="mt-1 text-sm text-gray-600">They appear here once skills are added to the Developmental Checklist.</p>
        </div>
      ) : (
        <>
          <section aria-label="Quarter summary" className="space-y-4 rounded-xl bg-[#f6f1df] p-4 md:p-5">
            <div className="space-y-1">
              <p className="text-base font-bold text-gray-900">
                {learnerName} has achieved {counts.achieved} of {shown.length} {shown.length === 1 ? "skill" : "skills"}
              </p>
              <p className="text-sm text-gray-700">
                {rated === 0
                  ? "No skills have been rated for this quarter yet."
                  : `${rated} rated so far, ${counts.unrated} still waiting for a rating.`}
              </p>
            </div>

            <div
              role="img"
              aria-label={STATUS_ORDER.filter((s) => counts[s]).map((s) => `${STATUS[s].label}: ${counts[s]}`).join(", ")}
              className="flex h-3 overflow-hidden rounded-full bg-white"
            >
              {STATUS_ORDER.map((s) =>
                counts[s] && s !== "unrated" ? <span key={s} className={STATUS[s].dot} style={{ width: `${(counts[s] / shown.length) * 100}%` }} /> : null,
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Show skills</p>
              <div className="flex flex-wrap gap-2">
                {(["all", ...STATUS_ORDER.filter((s) => counts[s])] as (Status | "all")[]).map((option) => {
                  const active = activeFilter === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(option)}
                      className={cn(
                        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5b0610]/40",
                        active ? "border-[#4a0e1c] bg-[#4a0e1c] text-white" : "border-gray-300 bg-white text-gray-800 hover:border-[#5b0610]",
                      )}
                    >
                      {option !== "all" && <span aria-hidden="true" className={cn("size-2.5 rounded-full", STATUS[option].dot, option === "unrated" && "border border-gray-400")} />}
                      {option === "all" ? "All" : STATUS[option].label}
                      <span className={cn("tabular-nums", active ? "text-white/80" : "text-gray-600")}>{option === "all" ? shown.length : counts[option]}</span>
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

          {domains.map((domain) => {
            const all = shown.filter((i) => i.domainId === domain.domainId);
            const achieved = all.filter((i) => i.rating === "achieved").length;
            return (
              <section key={domain.domainId} aria-labelledby={`progress-domain-${domain.domainId}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-[#5b0610]/15 pb-2">
                  <h3 id={`progress-domain-${domain.domainId}`} className="text-base font-bold text-[#4a0e1c]">
                    {domain.domainName}
                  </h3>
                  <p className="text-sm tabular-nums text-gray-700">
                    {achieved} of {all.length} achieved
                  </p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {domain.skills.map((skill) => {
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
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
