"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { sectionLabel, useSections } from "@/hooks/useSections";
import { apiFetch } from "@/lib/api";

type ScheduleRow = {
  sectionModuleId: number;
  moduleName: string;
  scheduleId: number | null;
  startTime: string | null;
  endTime: string | null;
  days: number[];
};

// ISO weekday numbers, matching schedule_days.day_of_week.
const DAYS = [
  { day: 1, label: "M", name: "Monday" },
  { day: 2, label: "T", name: "Tuesday" },
  { day: 3, label: "W", name: "Wednesday" },
  { day: 4, label: "Th", name: "Thursday" },
  { day: 5, label: "F", name: "Friday" },
];

const timeClass = (error?: string) =>
  cn(
    "h-9 w-[7.5rem] shrink-0 rounded-lg border bg-white px-2 text-sm text-gray-900 outline-none focus:border-[#5b0610] focus:ring-2 focus:ring-[#5b0610]/10",
    error ? "border-red-400" : "border-gray-300",
  );

export default function SchedulePanel() {
  const router = useRouter();
  const { sections, loading: sectionsLoading, failed: sectionsFailed } = useSections(true);
  const [sectionId, setSectionId] = useState<number | null>(null);
  // Tagged with its section so a slow response never shows under another one; rows is null when loading failed.
  const [loaded, setLoaded] = useState<{ sectionId: number; rows: ScheduleRow[] | null }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const selectedId = sectionId ?? sections[0]?.sectionId ?? null;

  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    apiFetch(`/api/sections/${selectedId}/schedule`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET schedule failed: ${res.status}`);
        return (await res.json()) as ScheduleRow[];
      })
      .then((rows) => {
        if (!cancelled) setLoaded({ sectionId: selectedId, rows });
      })
      .catch((error) => {
        console.error("[SchedulePanel]", error);
        if (!cancelled) setLoaded({ sectionId: selectedId, rows: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const rows = loaded?.sectionId === selectedId ? loaded.rows : undefined;

  const edit = (index: number, change: Partial<ScheduleRow>) =>
    setLoaded((prev) =>
      prev?.rows ? { ...prev, rows: prev.rows.map((r, i) => (i === index ? { ...r, ...change } : r)) } : prev,
    );

  const toggleDay = (index: number, day: number) => {
    const days = rows![index].days;
    edit(index, { days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b) });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rows || selectedId === null) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/sections/${selectedId}/schedule`, {
        method: "PUT",
        body: JSON.stringify({
          modules: rows.map(({ sectionModuleId, startTime, endTime, days }) => ({ sectionModuleId, startTime, endTime, days })),
        }),
      });
      if (res.status === 422) {
        const { errors: fieldErrors } = (await res.json()) as { errors: Record<string, string[]> };
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])));
        return;
      }
      if (!res.ok) throw new Error(`PUT schedule failed: ${res.status}`);
      setLoaded({ sectionId: selectedId, rows: (await res.json()) as ScheduleRow[] });
      toast.success("Schedule saved!", { position: "top-center" });
      // The dashboard and Modules page read this timetable.
      router.refresh();
    } catch (error) {
      console.error("[SchedulePanel]", error);
      toast.error("Could not save the schedule. Please try again.", { position: "top-center" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-stone-900">Class Schedule</h3>
          <p className="text-xs text-stone-500 mt-0.5">Set each module&apos;s time and days for a section.</p>
        </div>
        {sections.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="settings-schedule-section" className="text-xs font-bold text-gray-700 shrink-0">
              Section
            </label>
            <select
              id="settings-schedule-section"
              value={selectedId ?? ""}
              onChange={(e) => {
                setSectionId(Number(e.target.value));
                setErrors({});
              }}
              className="h-9 min-w-0 cursor-pointer rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none focus:border-[#5b0610] focus:ring-2 focus:ring-[#5b0610]/10"
            >
              {sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {sectionLabel(s)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {sectionsFailed ? (
        <p className="text-sm text-red-500">Could not load sections. Please try again.</p>
      ) : sectionsLoading ? (
        <p className="text-sm text-gray-500">Loading sections…</p>
      ) : sections.length === 0 ? (
        <p className="text-sm text-gray-500">No sections yet. Add one in the Sections tab.</p>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            {rows === undefined ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Loading schedule…</p>
            ) : rows === null ? (
              <p className="px-4 py-6 text-center text-sm text-red-500">Could not load the schedule. Please try again.</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">This section has no modules.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map((row, i) => {
                  const rowErrors = [`modules.${i}.startTime`, `modules.${i}.endTime`, `modules.${i}.days`]
                    .map((key) => errors[key])
                    .filter(Boolean);
                  // A never-scheduled module (e.g. one just added) may stay blank; the API skips it.
                  const required = !!(row.scheduleId || row.startTime || row.endTime || row.days.length);
                  return (
                    <li key={row.sectionModuleId} className="space-y-1.5 px-4 py-2.5">
                      <fieldset className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                        <legend className="sr-only">{row.moduleName}</legend>
                        <span aria-hidden="true" className="w-24 shrink-0 truncate text-sm font-semibold text-gray-900">
                          {row.moduleName}
                        </span>
                        <input
                          type="time"
                          required={required}
                          aria-label={`${row.moduleName} start time`}
                          value={row.startTime ?? ""}
                          onChange={(e) => edit(i, { startTime: e.target.value })}
                          aria-invalid={!!errors[`modules.${i}.startTime`]}
                          className={timeClass(errors[`modules.${i}.startTime`])}
                        />
                        <span className="text-xs text-gray-500">to</span>
                        <input
                          type="time"
                          required={required}
                          aria-label={`${row.moduleName} end time`}
                          value={row.endTime ?? ""}
                          onChange={(e) => edit(i, { endTime: e.target.value })}
                          aria-invalid={!!errors[`modules.${i}.endTime`]}
                          className={timeClass(errors[`modules.${i}.endTime`])}
                        />
                        <div className="flex shrink-0 gap-1">
                          {DAYS.map(({ day, label, name }) => {
                            const on = row.days.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                aria-pressed={on}
                                aria-label={`${row.moduleName} on ${name}`}
                                onClick={() => toggleDay(i, day)}
                                className={cn(
                                  "h-8 w-7 cursor-pointer rounded-md text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar/40",
                                  on ? "bg-sidebar text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                      {rowErrors.map((message) => (
                        <p key={message} className="text-xs text-red-500">
                          {message}
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {errors.modules && <p className="text-xs text-red-500">{errors.modules}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !rows?.length}
              className="inline-flex h-9.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-3.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#7e1422] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
            >
              {saving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
