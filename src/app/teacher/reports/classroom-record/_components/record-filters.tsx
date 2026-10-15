"use client";

import { useRouter } from "next/navigation";
import SectionSelector, { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import type { Section } from "@/types/db";
import Segmented from "@/app/teacher/_components/shared/segmented";

const QUARTERS = [1, 2, 3, 4];

const VIEWS = [
  { value: "all", label: "All Weeks" },
  { value: "week", label: "By Week" },
];

/** Section, module, quarter and view pickers; the URL holds the choice so the server re-renders the table. */
export default function RecordFilters({
  sections,
  sectionId,
  modules,
  moduleId,
  domains,
  domainId,
  quarter,
  view,
  week,
}: {
  sections: Section[];
  sectionId: number | null;
  modules: { id: number; name: string }[];
  moduleId: number | null;
  domains: { id: number; name: string }[];
  domainId: number | null;
  quarter: number;
  view: "all" | "week";
  week: number | null;
}) {
  const router = useRouter();
  // The week rides along on every change; the server keeps it if the new quarter has it, else picks the first week.
  const go = (next: { module?: number | null; domain?: number | null; quarter?: number; view?: string }) => {
    const params = new URLSearchParams({
      section: String(sectionId),
      module: String((next.module !== undefined ? next.module : moduleId) ?? ""),
      domain: String((next.domain !== undefined ? next.domain : domainId) ?? ""),
      quarter: String(next.quarter ?? quarter),
    });
    if ((next.view ?? view) === "week") params.set("view", "week");
    if (week !== null) params.set("week", String(week));
    router.push(`/teacher/reports/classroom-record?${params}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <SectionSelector sections={sections} selectedSectionId={sectionId} />
      {sectionId !== null && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
            Module
            <select
              value={moduleId ?? ""}
              onChange={(e) => go({ module: Number(e.target.value), domain: null })}
              disabled={modules.length === 0}
              className={SELECT_CLASS}
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {domains.length > 1 && (
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
              Domain
              <select value={domainId ?? ""} onChange={(e) => go({ domain: Number(e.target.value) })} className={SELECT_CLASS}>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Segmented
            label="Quarter"
            options={QUARTERS.map((q) => ({ value: String(q), label: `Q${q}`, ariaLabel: `Quarter ${q}` }))}
            value={String(quarter)}
            onChange={(q) => go({ quarter: Number(q) })}
          />
          <Segmented label="View" options={VIEWS} value={view} onChange={(v) => go({ view: v })} />
        </>
      )}
    </div>
  );
}
