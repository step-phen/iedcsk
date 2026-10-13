import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { PRACTICAL_RESULT_LABEL, type PracticalResultValue } from "@/constants/enums";
import type { Section } from "@/types/db";
import { hasMiddleName } from "@/lib/learners";
import { cn } from "@/lib/utils";
import { RESULT_CLASS, percentOf, scoreBand } from "@/lib/score-band";
import RecordFilters from "./record-filters";
import PrintRecord from "./print-record";

type Cell = { score: number; maxScore: number } | { rating: PracticalResultValue | null };

/** GET /api/sections/{id}/classroom-record */
interface ClassroomRecord {
  modules: { id: number; name: string }[];
  moduleId: number | null;
  domains: { id: number; name: string }[];
  domainId: number | null;
  quarter: number;
  columns: { activityId: number; name: string; format: "digital" | "practical"; week: number; day: number; maxScore: number | null }[];
  rows: {
    learnerId: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    extensionName: string | null;
    cells: Record<number, Cell>;
    total: { score: number; maxScore: number } | null;
  }[];
}

type Row = ClassroomRecord["rows"][number];

const DOT_CLASS: Record<PracticalResultValue, string> = {
  needs_help: "bg-rose-500",
  good: "bg-amber-500",
  very_good: "bg-emerald-500",
};

const LEGEND: [PracticalResultValue, string][] = [
  ["very_good", "80% and up"],
  ["good", "60–79%"],
  ["needs_help", "below 60%"],
];

const PILL = "inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums";

function learnerName(row: Row) {
  return `${row.lastName}, ${[row.firstName, hasMiddleName(row.middleName) && row.middleName, row.extensionName].filter(Boolean).join(" ")}`;
}

export default async function ClassScoresSection({
  section,
  module,
  domain,
  quarter,
  teacherName,
}: {
  section?: string;
  module?: string;
  domain?: string;
  quarter?: string;
  teacherName: string | null;
}) {
  // Same section rule as the Classroom page: a stale or foreign ?section= falls back to the first section.
  const sections = await serverApi("/api/sections")
    .then(async (res) => (res.ok ? ((await res.json()) as Section[]) : []))
    .catch(() => []);
  const current = sections.find((s) => String(s.sectionId) === section) ?? sections[0];
  const sectionId = current?.sectionId ?? null;

  const params = new URLSearchParams();
  if (module) params.set("moduleId", module);
  if (domain) params.set("domainId", domain);
  if (quarter) params.set("quarter", quarter);
  const record =
    sectionId === null
      ? null
      : await serverApi(`/api/sections/${sectionId}/classroom-record?${params}`)
          .then(async (res) => (res.ok ? ((await res.json()) as ClassroomRecord) : null))
          .catch(() => null);

  const hasTable = !!record && record.columns.length > 0 && record.rows.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* A floating translucent bar that stays under the header while the record scrolls beneath it. */}
      <div className="material-bar sticky top-[4.25rem] z-20 flex flex-wrap items-center gap-3 rounded-xl px-5 py-3">
        <RecordFilters
          sections={sections}
          sectionId={sectionId}
          modules={record?.modules ?? []}
          moduleId={record?.moduleId ?? null}
          domains={record?.domains ?? []}
          domainId={record?.domainId ?? null}
          quarter={record?.quarter ?? 1}
        />
        {hasTable && (
          <PrintRecord
            details={[
              `Adviser: ${teacherName ?? "—"}`,
              `Section: ${current.gradeLevel} - ${current.sectionName}`,
              `Module: ${record.modules.find((m) => m.id === record.moduleId)?.name ?? "—"}${
                record.domains.length > 1 ? ` – ${record.domains.find((d) => d.id === record.domainId)?.name ?? "—"}` : ""
              } · Quarter ${record.quarter}`,
            ]}
          >
            <ScoresTable record={record} print />
            <Legend />
          </PrintRecord>
        )}
      </div>
      {/* Keyed by what is shown, so a new section, module or quarter cross-fades in instead of jumping. */}
      <div
        key={`${sectionId}-${record?.moduleId}-${record?.domainId}-${record?.quarter}`}
        className="space-y-3 rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      >
        {sectionId === null ? (
          <Empty heading="No sections yet" message="Add a section in Settings › Sections." />
        ) : !record ? (
          <Empty heading="Could not load the class scores" message="Please refresh the page." />
        ) : record.columns.length === 0 ? (
          <Empty heading="No activities yet" message="This module has no activities in this quarter." />
        ) : record.rows.length === 0 ? (
          <Empty heading="No learners yet" message="Add learners to this section on the Learners page." />
        ) : (
          <>
            <Summary record={record} />
            <ScoresTable record={record} sectionId={sectionId} />
            <Legend />
          </>
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

/** One line a teacher can read before the table: class size, average, and ratings still owed. */
function Summary({ record }: { record: ClassroomRecord }) {
  const totals = record.rows.flatMap((r) => (r.total ? [(r.total.score / r.total.maxScore) * 100] : []));
  const average = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  const toRate = record.rows.reduce(
    (n, r) => n + Object.values(r.cells).filter((c) => "rating" in c && c.rating === null).length,
    0,
  );

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-gray-700">
      <span>
        <b className="font-semibold text-gray-900 tabular-nums">{record.rows.length}</b> learner{record.rows.length === 1 ? "" : "s"}
      </span>
      {average !== null && (
        <>
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span>
            Class average <span className={cn(PILL, RESULT_CLASS[scoreBand(average)])}>{average}%</span>
          </span>
        </>
      )}
      {toRate > 0 && (
        <>
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span className="font-semibold text-amber-700">
            {toRate} practical {toRate === 1 ? "activity" : "activities"} waiting for your rating
          </span>
        </>
      )}
    </p>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
      {LEGEND.map(([value, range]) => (
        <span key={value} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5 rounded-full", DOT_CLASS[value])} />
          <span className="font-semibold text-gray-800">{PRACTICAL_RESULT_LABEL[value]}</span> {range}
        </span>
      ))}
      <span>
        <span className="font-semibold text-gray-800">—</span> Not done yet
      </span>
      <span>
        <span className="font-semibold text-amber-700">To rate</span> Practical activity waiting for your rating
      </span>
      <span>
        <span className="font-semibold text-gray-800">Total</span> counts a practical rating as Very Good 3, Good 2, Needs Help 1 (out of 3)
      </span>
    </div>
  );
}

/** Learners as rows, activities as columns grouped by week; `print` drops the scroll box for the printed copy. */
function ScoresTable({ record, sectionId, print = false }: { record: ClassroomRecord; sectionId?: number; print?: boolean }) {
  const weeks = [...new Set(record.columns.map((c) => c.week))];
  // A sticky cell paints its background over the collapsed borders, so the printed copy drops it.
  const stickyNum = print ? undefined : "sticky left-0 z-10";
  // Pinned right after the 2.5rem # column; the inset shadow draws its edge since collapsed borders do not stick.
  const stickyCol = print ? undefined : "sticky left-10 z-10 shadow-[inset_-1px_0_0_var(--color-gray-200)]";

  return (
    <div className={print ? undefined : "overflow-x-auto rounded-lg border border-gray-200 scrollbar-thin"}>
      {/* Printed, every cell gets a dark full border so the grid stays readable on paper. */}
      <table
        className={cn(
          "w-full",
          print
            ? "border border-gray-700 text-[8pt] [&_td]:border [&_td]:border-gray-700 [&_th]:border [&_th]:border-gray-700 [&_tr]:border-gray-700"
            : "text-sm",
        )}
      >
        <thead className="bg-gray-50 text-gray-600">
          <tr className="border-b border-gray-200">
            <th rowSpan={2} className={cn(stickyNum, "w-10 min-w-10 bg-gray-50 px-2 py-2 text-center font-semibold align-bottom")}>
              #
            </th>
            <th rowSpan={2} className={cn(stickyCol, "bg-gray-50 px-3 py-2 text-left font-semibold align-bottom")}>
              Learner
            </th>
            {weeks.map((week) => (
              <th
                key={week}
                colSpan={record.columns.filter((c) => c.week === week).length}
                className="border-l border-gray-200 px-2 py-1 text-center text-xs font-semibold"
              >
                Week {week}
              </th>
            ))}
            <th rowSpan={2} className="border-l border-gray-200 px-3 py-2 text-center font-semibold align-bottom">
              Total
            </th>
          </tr>
          <tr className="border-b-2 border-gray-300">
            {record.columns.map((c) => (
              <th key={c.activityId} className="border-l border-gray-200 px-2 py-2 text-center font-semibold text-gray-900">
                <div className="mx-auto max-w-36 text-[10px] leading-tight">{c.name}</div>
                <div className="mt-0.5 text-[11px] font-medium text-gray-500">
                  {c.format === "practical" ? "Practical" : c.maxScore !== null ? `out of ${c.maxScore}` : "Digital"}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {record.rows.map((row, i) => {
            const stripe = i % 2 === 1 ? "bg-gray-50" : "bg-white";
            const total = row.total ? percentOf(row.total.score, row.total.maxScore) : null;
            return (
              <tr key={row.learnerId} className={cn("border-t border-gray-200", stripe)}>
                <td className={cn(stickyNum, "w-10 min-w-10 px-2 py-2 text-center text-gray-500 tabular-nums", stripe)}>{i + 1}</td>
                <td className={cn(stickyCol, "whitespace-nowrap px-3 py-2 font-medium capitalize text-gray-900", stripe)}>
                  {/* On screen, a name opens that learner's progress report for the same quarter. */}
                  {print || !sectionId ? (
                    learnerName(row)
                  ) : (
                    <Link
                      href={`/teacher/reports/progress-report?section=${sectionId}&learner=${row.learnerId}&quarter=${record.quarter}`}
                      className="hover:text-sidebar hover:underline underline-offset-2"
                    >
                      {learnerName(row)}
                    </Link>
                  )}
                </td>
                {record.columns.map((c) => (
                  <td key={c.activityId} className="border-l border-gray-200 px-2 py-2 text-center">
                    <CellValue cell={row.cells[c.activityId]} />
                  </td>
                ))}
                <td className="border-l border-gray-200 px-3 py-2 text-center">
                  {/* Scores and rated practicals as a whole percent; hovering shows the raw points. */}
                  {row.total && total !== null ? (
                    <span title={`${row.total.score} of ${row.total.maxScore}`} className={cn(PILL, "text-[13px] font-bold", RESULT_CLASS[scoreBand(total)])}>
                      {total}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ cell }: { cell: Cell | undefined }) {
  if (!cell) return <span className="text-gray-300" title="Not done yet">—</span>;
  if ("score" in cell) {
    return (
      <span title={`${cell.score} of ${cell.maxScore}`} className={cn(PILL, "min-w-8", RESULT_CLASS[scoreBand(percentOf(cell.score, cell.maxScore))])}>
        {cell.score}
      </span>
    );
  }
  if (!cell.rating) {
    return (
      <span title="Watched, waiting for your rating" className={cn(PILL, "border border-dashed border-amber-400 text-amber-700")}>
        To rate
      </span>
    );
  }
  return <span className={cn(PILL, RESULT_CLASS[cell.rating])}>{PRACTICAL_RESULT_LABEL[cell.rating]}</span>;
}
