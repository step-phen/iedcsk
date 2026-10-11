"use client";

import { useRouter } from "next/navigation";
import SectionSelector, { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import type { Section } from "@/types/db";
import Segmented from "@/app/teacher/_components/shared/segmented";

const QUARTERS = [1, 2, 3, 4];

/** Section, module and quarter pickers; the URL holds the choice so the server re-renders the table. */
export default function RecordFilters({
  sections,
  sectionId,
  modules,
  moduleId,
  domains,
  domainId,
  quarter,
}: {
  sections: Section[];
  sectionId: number | null;
  modules: { id: number; name: string }[];
  moduleId: number | null;
  domains: { id: number; name: string }[];
  domainId: number | null;
  quarter: number;
}) {
  const router = useRouter();
  const go = (nextModule: number | null, nextDomain: number | null, nextQuarter: number) =>
    router.push(
      `/teacher/reports/classroom-record?section=${sectionId}&module=${nextModule ?? ""}&domain=${nextDomain ?? ""}&quarter=${nextQuarter}`,
      { scroll: false },
    );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <SectionSelector sections={sections} selectedSectionId={sectionId} />
      {sectionId !== null && (
        <>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
            Module
            <select
              value={moduleId ?? ""}
              onChange={(e) => go(Number(e.target.value), null, quarter)}
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
              <select
                value={domainId ?? ""}
                onChange={(e) => go(moduleId, Number(e.target.value), quarter)}
                className={SELECT_CLASS}
              >
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
            onChange={(q) => go(moduleId, domainId, Number(q))}
          />
        </>
      )}
    </div>
  );
}
