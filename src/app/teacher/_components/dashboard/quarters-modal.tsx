"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { displaySchoolYear } from "@/hooks/useActiveSchoolYear";
import {
  SchoolYearField,
  StatusBadge,
  addButtonClass,
  fetchSchoolYears,
  fieldClass,
} from "@/app/teacher/_components/layout/settings-modal";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { Quarter, SchoolYear } from "@/types/db";

const QUARTER_NAMES = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

// Dashboard button that opens Manage Quarters in a modal, one click from the teacher's home page.
export default function QuartersButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sidebar bg-white border border-stone-300 hover:border-sidebar rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
      >
        <CalendarRange size={16} />
        Quarters
      </button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Manage Quarters"
        subtitle="Manage Quarter 1–4 dates and status for a school year."
        headerId="quarters-modal-title"
        maxWidth="max-w-3xl"
      >
        <QuartersPanel />
      </ModalShell>
    </>
  );
}

// Quarters always belong to one school year; the selector only picks which year's four are shown.
function QuartersPanel() {
  const router = useRouter();
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Tagged with the year it belongs to, so a slow response never shows under another year.
  // quarters is null when loading failed.
  const [loaded, setLoaded] = useState<{ yearId: number; quarters: Quarter[] | null }>();
  const [saving, setSaving] = useState(false);
  // Server validation messages keyed like "quarters.1.endDate".
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<Quarter | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSchoolYears()
      .then((list) => {
        if (!cancelled) setYears(list);
      })
      .catch((error) => {
        console.error("[QuartersPanel]", error);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Until the teacher picks one: the active year, else the first listed (newest start date).
  const selected =
    years.find((y) => y.schoolYearId === selectedId) ?? years.find((y) => y.status === "active") ?? years[0];
  const yearId = selected?.schoolYearId;

  const loadQuarters = (id: number) =>
    apiFetch(`/api/school-years/${id}/quarters`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET quarters failed: ${res.status}`);
        setLoaded({ yearId: id, quarters: (await res.json()) as Quarter[] });
      })
      .catch((error) => {
        console.error("[QuartersPanel]", error);
        setLoaded({ yearId: id, quarters: null });
      });

  useEffect(() => {
    if (yearId !== undefined) void loadQuarters(yearId);
  }, [yearId]);

  // undefined while the selected year's quarters are loading.
  const quarters = loaded && loaded.yearId === yearId ? loaded.quarters : undefined;
  // Sends all four quarters in one request; a blank quarter stays unconfigured and none is activated.
  const saveAll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const id = selected.schoolYearId;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/school-years/${id}/quarters`, {
        method: "PUT",
        body: JSON.stringify({
          quarters: QUARTER_NAMES.map((_, i) => ({
            startDate: form.get(`q${i}-startDate`) || null,
            endDate: form.get(`q${i}-endDate`) || null,
          })),
        }),
      });
      if (res.status === 422) {
        const { errors: fieldErrors } = (await res.json()) as { errors: Record<string, string[]> };
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])));
        return;
      }
      if (!res.ok) throw new Error(`PUT quarters failed: ${res.status}`);
      setLoaded({ yearId: id, quarters: (await res.json()) as Quarter[] });
      toast.success("Quarters saved!", { position: "top-center" });
      // The dashboard's progress card and today's schedule read the active quarter's dates.
      router.refresh();
    } catch (error) {
      console.error("[QuartersPanel]", error);
      toast.error("Could not save the quarters. Please try again.", { position: "top-center" });
    } finally {
      setSaving(false);
    }
  };

  const activate = async (quarter: Quarter) => {
    setActivating(true);
    try {
      const res = await apiFetch(
        `/api/school-years/${quarter.schoolYearId}/quarters/${quarter.quarterNumber}/activate`,
        { method: "PATCH" },
      );
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        toast.error(errors.quarter?.[0] ?? "Could not change the active quarter.", { position: "top-center" });
        return;
      }
      if (!res.ok) throw new Error(`PATCH activate failed: ${res.status}`);
      // The previous quarter's new status (completed or upcoming) is decided server-side, so reload the list.
      void loadQuarters(quarter.schoolYearId);
      toast.success(`${quarter.name} is now the active quarter.`, { position: "top-center" });
      // The dashboard's progress card and today's schedule read the active quarter.
      router.refresh();
    } catch (error) {
      console.error("[QuartersPanel]", error);
      toast.error("Could not change the active quarter. Please try again.", { position: "top-center" });
    } finally {
      setActivating(false);
      setConfirming(null);
    }
  };
  const currentQuarter = quarters?.find((q) => q.status === "active");

  return (
    <div className="space-y-4 p-5">
      {failed ? (
        <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-red-500">
          Could not load school years. Please try again.
        </p>
      ) : loading ? (
        <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          Loading school years…
        </p>
      ) : !selected ? (
        <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No school years available.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="quarters-modal-year" className="text-xs font-bold text-gray-700">
              School Year
            </label>
            <select
              id="quarters-modal-year"
              value={selected.schoolYearId}
              onChange={(e) => {
                setSelectedId(Number(e.target.value));
                setErrors({});
              }}
              className={cn(fieldClass(), "w-auto sm:min-w-48")}
            >
              {years.map((y) => (
                <option key={y.schoolYearId} value={y.schoolYearId}>
                  {displaySchoolYear(y.name)}
                </option>
              ))}
            </select>
            <StatusBadge status={selected.status} />
          </div>

          {!selected.startDate || !selected.endDate ? (
            <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              Set this school year&apos;s start and end dates in Settings › School Year first.
            </p>
          ) : quarters === undefined ? (
            <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              Loading quarters…
            </p>
          ) : quarters === null ? (
            <p className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-red-500">
              Could not load quarters. Please try again.
            </p>
          ) : (
            // Keyed by year so switching years refills every input from that year's quarters.
            <form key={selected.schoolYearId} onSubmit={saveAll} className="space-y-3">
              <ul className="grid gap-3 sm:grid-cols-2">
                {QUARTER_NAMES.map((name, i) => {
                  const quarter = quarters.find((q) => q.quarterNumber === i + 1);
                  // The pickers stay inside the school year; the server also checks order and overlap.
                  const bounds = { min: selected.startDate ?? undefined, max: selected.endDate ?? undefined };
                  return (
                    <li
                      key={name}
                      className={cn(
                        "space-y-2.5 rounded-lg border px-4 py-3 text-sm",
                        quarter?.status === "active" ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarRange size={16} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                        <p className="font-semibold text-gray-900">{name}</p>
                        <span className="ml-auto">
                          {quarter ? (
                            <StatusBadge status={quarter.status} />
                          ) : (
                            <span className="text-xs text-gray-500">Not configured</span>
                          )}
                        </span>
                      </div>
                      <fieldset className="space-y-2">
                        <legend className="sr-only">{name} dates</legend>
                        <SchoolYearField
                          field={`q${i}-startDate`}
                          label="Start Date"
                          type="date"
                          required={false}
                          {...bounds}
                          defaultValue={quarter?.startDate}
                          error={errors[`quarters.${i}.startDate`]}
                        />
                        <SchoolYearField
                          field={`q${i}-endDate`}
                          label="End Date"
                          type="date"
                          required={false}
                          {...bounds}
                          defaultValue={quarter?.endDate}
                          error={errors[`quarters.${i}.endDate`]}
                        />
                      </fieldset>
                      {quarter && quarter.status !== "active" && selected.status === "active" && (
                        <button
                          type="button"
                          onClick={() => setConfirming(quarter)}
                          aria-label={`Set ${name} as active`}
                          className="cursor-pointer rounded text-xs font-semibold text-[#5b0610] hover:underline outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
                        >
                          Set as Active
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {errors.quarters && <p className="text-xs text-red-500">{errors.quarters}</p>}

              <div className="flex flex-wrap items-center justify-end gap-3">
                {selected.status !== "active" && (
                  <p className="mr-auto text-xs text-gray-500">
                    Only quarters of the active school year can be set as active.
                  </p>
                )}
                <button type="submit" disabled={saving} className={addButtonClass}>
                  {saving ? "Saving..." : "Save All Quarters"}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && !activating && setConfirming(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Set Active Quarter?</AlertDialogTitle>
            <AlertDialogDescription>
              Make {confirming?.name} the active quarter of {selected && displaySchoolYear(selected.name)}?
              {currentQuarter && ` This will replace ${currentQuarter.name} as the current active quarter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={activating} onClick={() => confirming && activate(confirming)}>
              {activating ? "Setting..." : "Set as Active"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
