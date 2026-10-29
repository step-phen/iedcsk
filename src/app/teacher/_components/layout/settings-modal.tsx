"use client";

import { useActionState, useEffect, useState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CalendarClock, CalendarDays, KeyRound, Layers, Pencil, Plus, type LucideIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { ModalShell } from "@/components/ui/modal-shell";
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
import { displaySchoolYear, reloadActiveSchoolYear, useActiveSchoolYear } from "@/hooks/useActiveSchoolYear";
import ChangePasswordForm from "@/app/teacher/_components/layout/change-password-form";
import SchedulePanel from "@/app/teacher/_components/layout/schedule-panel";
import HandoverPanel from "@/app/teacher/_components/layout/handover-panel";
import { cn } from "@/lib/utils";
import { invalidateSections, sectionLabel, useSections } from "@/hooks/useSections";
import { apiFetch } from "@/lib/api";
import type { SchoolYear, Section, SectionChoice } from "@/types/db";

// The only sections a school year can have; each starts with its session's default timetable.
const SECTION_CHOICES: { name: SectionChoice; label: string }[] = [
  { name: "Joy", label: "Kindergarten - Joy — Morning" },
  { name: "Faith", label: "Kindergarten - Faith — Afternoon" },
];

type SaveSchoolYearState = {
  success: boolean;
  schoolYear?: SchoolYear;
  error: string | null;
  fieldErrors: { name?: string; startDate?: string; endDate?: string };
};

const initialSchoolYearState: SaveSchoolYearState = { success: false, error: null, fieldErrors: {} };

// Creates a school year, or updates it in place when the form carries a schoolYearId.
async function saveSchoolYear(formData: FormData): Promise<SaveSchoolYearState> {
  const id = formData.get("schoolYearId");
  // Accept "SY 2026–2027" as typed; the DB stores "2026-2027".
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/^SY\s*/i, "")
    .replace(/\s*[–—]\s*/, "-");
  try {
    const res = await apiFetch(id ? `/api/school-years/${id}` : "/api/school-years", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({ name, startDate: formData.get("startDate"), endDate: formData.get("endDate") }),
    });
    if (res.ok) return { success: true, schoolYear: (await res.json()) as SchoolYear, error: null, fieldErrors: {} };
    if (res.status === 422) {
      const { errors } = (await res.json()) as { errors: Record<string, string[]> };
      return {
        success: false,
        error: null,
        fieldErrors: { name: errors.name?.[0], startDate: errors.startDate?.[0], endDate: errors.endDate?.[0] },
      };
    }
    return { success: false, error: "Could not save the school year. Please try again.", fieldErrors: {} };
  } catch {
    return { success: false, error: "Could not reach the server. Please try again.", fieldErrors: {} };
  }
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
/** "2026-06-15" -> "Jun 15, 2026", read as UTC so it never shifts a day. */
const displayDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`));

type Tab = "sections" | "schedule" | "schoolYear" | "password" | "handover";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "sections", label: "Sections", icon: Layers },
  { id: "schedule", label: "Class Schedule", icon: CalendarClock },
  { id: "schoolYear", label: "School Year", icon: CalendarDays },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "handover", label: "Handover", icon: ArrowRightLeft },
];

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("sections");

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle="Manage your sections, class schedules, school years, password, and class handover."
      headerId="settings-modal-title"
      maxWidth="max-w-4xl"
      panelClassName="overflow-hidden"
    >
      <div className="flex min-h-[26rem] flex-col sm:flex-row">
        {/* Sidebar-style navigation, styled like the app's own rail. */}
        <nav aria-label="Settings" className="flex shrink-0 flex-wrap gap-1 bg-sidebar p-2 sm:w-48 sm:flex-col sm:flex-nowrap">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-8 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                    : "font-medium text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {active && (
                  <span aria-hidden="true" className="absolute left-0 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
                )}
                <Icon size={17} strokeWidth={2.2} className={cn(active && "text-sidebar-primary")} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 p-5">
          {tab === "sections" && <SectionsPanel />}
          {tab === "schedule" && <SchedulePanel />}
          {tab === "schoolYear" && <SchoolYearPanel onActivated={onClose} />}
          {tab === "password" && <ChangePasswordForm />}
          {tab === "handover" && <HandoverPanel />}
        </div>
      </div>
    </ModalShell>
  );
}

// A school year's sections are picked once, when it is activated (School Year tab); an unused one's name can change here.
function SectionsPanel() {
  const router = useRouter();
  const { sections: loaded, loading, failed } = useSections(true);
  const activeYear = useActiveSchoolYear();
  // Renamed rows replace the cached list until it is fetched again.
  const [renamed, setRenamed] = useState<Record<number, Section>>({});
  const sections = loaded.map((s) => renamed[s.sectionId] ?? s);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename(section: Section, name: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/sections/${section.sectionId}`, { method: "PATCH", body: JSON.stringify({ sectionName: name }) });
      if (res.ok) {
        const updated = (await res.json()) as Section;
        setRenamed((prev) => ({ ...prev, [updated.sectionId]: updated }));
        setEditingId(null);
        // Every section picker and the server-rendered pages pick up the new name.
        invalidateSections();
        router.refresh();
        toast.success("Section renamed.");
      } else if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        if (errors.section) {
          // Records arrived after the list loaded: the name is fixed now, so the row shows why instead of the form.
          setRenamed((prev) => ({ ...prev, [section.sectionId]: { ...section, canRename: false, renameReason: errors.section[0] } }));
          setEditingId(null);
          invalidateSections();
        } else {
          setError(errors.sectionName?.[0] ?? "Check the section name.");
        }
      } else {
        setError("Could not rename the section. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-stone-900">Sections</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Sections for the current school year. They are chosen when the school year is activated. You can edit a
          section&apos;s name until it has learners or classroom records; its session and schedule stay the same.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        {failed ? (
          <p className="px-4 py-6 text-center text-sm text-red-500">Could not load sections. Please try again.</p>
        ) : loading ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Loading sections…</p>
        ) : sections.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {activeYear === null
              ? "Activate a school year to set up its sections."
              : "No sections were set up for this school year."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sections.map((s) =>
              editingId === s.sectionId ? (
                <li key={s.sectionId} className="px-4 py-2.5 text-sm">
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void rename(s, String(new FormData(e.currentTarget).get("sectionName") ?? ""));
                    }}
                  >
                    <Layers size={16} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                    <label htmlFor={`section-name-${s.sectionId}`} className="text-xs font-semibold text-gray-600">
                      {s.gradeLevel} -
                    </label>
                    <input
                      id={`section-name-${s.sectionId}`}
                      name="sectionName"
                      defaultValue={s.sectionName}
                      maxLength={50}
                      required
                      autoFocus
                      aria-invalid={!!error}
                      aria-describedby={error ? `section-error-${s.sectionId}` : undefined}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-sidebar focus:outline-none focus:ring-2 focus:ring-sidebar/20"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-8 cursor-pointer rounded-lg bg-sidebar px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setEditingId(null);
                        setError(null);
                      }}
                      className="h-8 cursor-pointer rounded-lg border border-stone-300 px-3 text-xs font-semibold text-gray-700 hover:bg-stone-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    {error && (
                      <p id={`section-error-${s.sectionId}`} className="basis-full text-xs text-red-500">
                        {error}
                      </p>
                    )}
                  </form>
                </li>
              ) : (
                <li key={s.sectionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <Layers size={16} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                  <span className="min-w-0 flex-1 font-semibold text-gray-900">{sectionLabel(s)}</span>
                  <button
                    type="button"
                    disabled={saving || !s.canRename}
                    onClick={() => {
                      setEditingId(s.sectionId);
                      setError(null);
                    }}
                    aria-label={`Edit the name of ${s.sectionName}`}
                    aria-describedby={s.canRename ? undefined : `section-locked-${s.sectionId}`}
                    className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-2.5 text-xs font-semibold text-gray-700 enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </button>
                  {!s.canRename && (
                    <p id={`section-locked-${s.sectionId}`} className="basis-full pl-7 text-xs text-gray-500">
                      {s.renameReason ?? "This section has learner or classroom records, so its name can no longer be changed."}
                    </p>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/** onActivated: called once a year is activated and the header/dashboard data is refreshed. */
function SchoolYearPanel({ onActivated }: { onActivated: () => void }) {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // "new" for the create form, a row for the edit form, null when neither is open.
  const [editing, setEditing] = useState<SchoolYear | "new" | null>(null);
  // The year waiting on the Set as Active confirmation.
  const [confirming, setConfirming] = useState<SchoolYear | null>(null);
  const [activating, setActivating] = useState(false);
  // Why the last activation failed; shown in the dialog, which stays open so the teacher can retry.
  const [activateError, setActivateError] = useState<string | null>(null);
  // Sections to set up for a year that has none yet; reset each time the dialog opens.
  const [picks, setPicks] = useState<SectionChoice[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetchSchoolYears()
      .then((list) => {
        if (!cancelled) setYears(list);
      })
      .catch((error) => {
        console.error("[SchoolYearPanel]", error);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSaved = (saved: SchoolYear) => {
    setYears((prev) =>
      // Same order as the API: undated years first, then newest start date, then name.
      [...prev.filter((y) => y.schoolYearId !== saved.schoolYearId), saved].sort(
        (a, b) => (b.startDate ?? "9999-12-31").localeCompare(a.startDate ?? "9999-12-31") || b.name.localeCompare(a.name),
      ),
    );
    // Renaming the active year changes what the header shows.
    if (saved.status === "active") void reloadActiveSchoolYear();
    setEditing(null);
  };

  const activate = async (year: SchoolYear) => {
    setActivating(true);
    setActivateError(null);
    try {
      // A year's sections are set once: only a year without any sends the picks.
      const res = await apiFetch(`/api/school-years/${year.schoolYearId}/activate`, {
        method: "PATCH",
        ...(year.sections.length === 0 && { body: JSON.stringify({ sections: picks }) }),
      });
      // e.g. the year has no start/end dates yet; the server says why.
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setActivateError(Object.values(errors)[0]?.[0] ?? "Could not change the active school year.");
        return;
      }
      if (!res.ok) throw new Error(`PATCH activate failed: ${res.status}`);
      // Sections and everything keyed off them belong to the active year now. Dropped before the
      // store update so an open Add Learner form, which remounts its section list on it, refetches.
      invalidateSections();
      // Awaited so the header already shows the new year when the modal closes.
      await reloadActiveSchoolYear();
      // The previous year's new status (completed or upcoming) is decided server-side, so reload the list.
      fetchSchoolYears()
        .then(setYears)
        .catch(() => setFailed(true));
      toast.success(`${displaySchoolYear(year.name)} is now the active school year.`, { position: "top-center" });
      // The dashboard is server-rendered: refetches its sections and falls back to the new year's first one.
      router.refresh();
      setConfirming(null);
      onActivated();
    } catch (error) {
      console.error("[SchoolYearPanel]", error);
      setActivateError("Could not change the active school year. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const current = years.find((y) => y.status === "active");
  const setActiveButton = (year: SchoolYear) => (
    <button
      type="button"
      onClick={() => {
        setPicks(SECTION_CHOICES.map((c) => c.name));
        setActivateError(null);
        setConfirming(year);
      }}
      className="cursor-pointer rounded text-xs font-semibold text-[#5b0610] hover:underline outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
    >
      Set as Active
    </button>
  );
  const editButton = (year: SchoolYear) => (
    <button
      type="button"
      onClick={() => setEditing(year)}
      aria-label={`Edit ${displaySchoolYear(year.name)}`}
      className="cursor-pointer rounded text-xs font-semibold text-[#5b0610] hover:underline outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
    >
      Edit
    </button>
  );
  const addButton = (
    <button type="button" onClick={() => setEditing("new")} className={addButtonClass}>
      <Plus size={16} className="text-amber-300" />
      Add School Year
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-stone-900">School Year Management</h3>
          <p className="text-xs text-stone-500 mt-0.5">Manage school years and set the active academic year.</p>
        </div>
        {!editing && !loading && !failed && addButton}
      </div>

      {editing && (
        // Keyed so switching between create and each row's edit starts a fresh form and clears old errors.
        <SchoolYearForm
          key={editing === "new" ? "new" : editing.schoolYearId}
          year={editing === "new" ? undefined : editing}
          onSaved={onSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        {failed ? (
          <p className="px-4 py-6 text-center text-sm text-red-500">Could not load school years. Please try again.</p>
        ) : loading ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Loading school years…</p>
        ) : years.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No school years available.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {years.map((y) => (
              <li key={y.schoolYearId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{displaySchoolYear(y.name)}</p>
                  <p className="text-xs text-gray-500">
                    {y.startDate && y.endDate
                      ? `${displayDate(y.startDate)} – ${displayDate(y.endDate)}`
                      : "Dates not set yet"}
                  </p>
                </div>
                <span className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                  <StatusBadge status={y.status} />
                  {/* Only an upcoming year can be edited or switched to: the active one is in use, a completed one is history. */}
                  {y.status === "upcoming" && editButton(y)}
                  {y.status === "upcoming" && setActiveButton(y)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && !activating && setConfirming(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Set Active School Year?</AlertDialogTitle>
            <AlertDialogDescription>
              Make {confirming && displaySchoolYear(confirming.name)} the active school year?
              {current && ` This will replace ${displaySchoolYear(current.name)} as the current active school year.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirming && confirming.sections.length > 0 ? (
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-gray-900">Sections</p>
              <ul className="space-y-1">
                {SECTION_CHOICES.filter((c) => confirming.sections.includes(c.name)).map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-gray-700">
                    <Layers size={14} aria-hidden="true" className="shrink-0 text-[#5b0610]" />
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                This school year&apos;s sections are already set up. Activating keeps them and their learners,
                schedules and records unchanged.
              </p>
            </div>
          ) : (
            confirming && (
              <fieldset className="space-y-1.5 text-sm">
                <legend className="font-semibold text-gray-900">Sections for this school year</legend>
                {SECTION_CHOICES.map((c) => (
                  <label key={c.name} className="flex cursor-pointer items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={picks.includes(c.name)}
                      disabled={activating}
                      onChange={(e) =>
                        setPicks((prev) =>
                          e.target.checked ? SECTION_CHOICES.map((x) => x.name).filter((n) => n === c.name || prev.includes(n)) : prev.filter((n) => n !== c.name),
                        )
                      }
                      className="size-4 cursor-pointer accent-[#5b0610]"
                    />
                    {c.label}
                  </label>
                ))}
                <p className="text-xs text-gray-500">
                  These sections are created when you activate. Sections can&apos;t be added later in the school year.
                </p>
                {picks.length === 0 && <p className="text-xs text-red-500">Choose Joy, Faith, or both.</p>}
              </fieldset>
            )
          )}
          {activateError && (
            <p role="alert" className="text-sm text-red-500">
              {activateError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={activating || (!!confirming && confirming.sections.length === 0 && picks.length === 0)}
              onClick={() => confirming && activate(confirming)}
            >
              {activating ? "Setting..." : "Set as Active"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export async function fetchSchoolYears(): Promise<SchoolYear[]> {
  const res = await apiFetch("/api/school-years");
  if (!res.ok) throw new Error(`GET /api/school-years failed: ${res.status}`);
  return (await res.json()) as SchoolYear[];
}

const STATUS_BADGES: Record<SchoolYear["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700" },
  upcoming: { label: "Upcoming", className: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-500" },
};

// Shows the stored status exactly as the API returns it, never recomputed from dates.
// Takes a plain string so malformed data falls back to "Unknown" instead of crashing.
export function StatusBadge({ status }: { status: string }) {
  const badge = Object.hasOwn(STATUS_BADGES, status)
    ? STATUS_BADGES[status as SchoolYear["status"]]
    : { label: "Unknown", className: "border border-dashed border-gray-300 text-gray-500" };

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase", badge.className)}>
      {badge.label}
    </span>
  );
}

export const fieldClass = (error?: string) =>
  cn(
    "h-9.5 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#5b0610] focus:ring-2 focus:ring-[#5b0610]/10",
    error ? "border-red-400" : "border-gray-300",
  );

export function SchoolYearField({
  field,
  label,
  error,
  ...inputProps
}: { field: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = `settings-sy-${field}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={field}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass(error)}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function SchoolYearForm({
  year,
  onSaved,
  onCancel,
}: {
  /** The row being edited; omitted when creating. */
  year?: SchoolYear;
  onSaved: (saved: SchoolYear) => void;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(async (_prev: SaveSchoolYearState, formData: FormData) => {
    const result = await saveSchoolYear(formData);
    if (result.success && result.schoolYear) {
      toast.success(year ? "School year updated!" : "School year created!", { position: "top-center" });
      onSaved(result.schoolYear);
    }
    return result;
  }, initialSchoolYearState);
  const { name, startDate, endDate } = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-gray-200 p-4">
      {year && <input type="hidden" name="schoolYearId" value={year.schoolYearId} />}
      <SchoolYearField
        field="name"
        label="School Year Name"
        placeholder="e.g. 2026-2027"
        defaultValue={year?.name}
        error={name}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Optional: an upcoming year can be saved before its official dates are known. */}
        <SchoolYearField
          field="startDate"
          label="Start Date (Optional)"
          type="date"
          required={false}
          defaultValue={year?.startDate ?? undefined}
          error={startDate}
        />
        <SchoolYearField
          field="endDate"
          label="End Date (Optional)"
          type="date"
          required={false}
          defaultValue={year?.endDate ?? undefined}
          error={endDate}
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9.5 cursor-pointer rounded-lg border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
        >
          Cancel
        </button>
        <SaveSchoolYearButton isEdit={!!year} />
      </div>
    </form>
  );
}

function SaveSchoolYearButton({ isEdit, createLabel = "Create School Year" }: { isEdit: boolean; createLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={addButtonClass}>
      {isEdit ? (pending ? "Saving..." : "Save Changes") : pending ? "Creating..." : createLabel}
    </button>
  );
}

export const addButtonClass =
  "inline-flex h-9.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-3.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#7e1422] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40";