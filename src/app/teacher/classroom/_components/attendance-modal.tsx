"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock, Search, X } from "lucide-react";
import { toast } from "react-hot-toast";
import type { LearnerListItem } from "@/types/learner";
import {
  getInitials,
  getAvatarColor,
  hasMiddleName,
  matchesLearnerSearch,
  middleInitial,
} from "@/lib/learners";
import type { AttendanceEntry } from "@/lib/validations/attendanceSchema";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api";

// Saves today's marks; the API keeps the daily record and the running class's roster in step.
async function saveAttendance(
  sectionId: number,
  entries: { learnerId: number; status: string }[],
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await apiFetch(`/api/sections/${sectionId}/attendance`, { method: "PUT", body: JSON.stringify({ entries }) });
    if (res.ok) return { success: true };
    if (res.status === 422) {
      const { errors } = (await res.json()) as { errors: Record<string, string[]> };
      return { success: false, error: Object.values(errors)[0]?.[0] ?? "Could not save attendance." };
    }
    return { success: false, error: "Could not save attendance. Please try again." };
  } catch {
    return { success: false, error: "Could not reach the server. Please try again." };
  }
}

type Status = AttendanceEntry["status"];

/**
 * The three marks, in the order a teacher reads them: the common case first,
 * then the two exceptions.
 */
const OPTIONS: {
  value: Status;
  label: string;
  icon: typeof Check;
  active: string;
}[] = [
  { value: "PRESENT", label: "Present", icon: Check, active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "LATE", label: "Late", icon: Clock, active: "bg-amber-500 text-white border-amber-500" },
  { value: "ABSENT", label: "Absent", icon: X, active: "bg-rose-600 text-white border-rose-600" },
];

/**
 * The roster rows only ever show a name and an avatar, so the modal asks for
 * identity fields alone — a full LearnerListItem satisfies this, and so does
 * the plainer row the classroom page fetches for it.
 */
export type AttendanceLearner = Pick<
  LearnerListItem,
  "learnerId" | "lrn" | "firstName" | "middleName" | "lastName"
>;

interface AttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: number;
  learners: AttendanceLearner[];
  /** learnerId -> status already recorded for today, from the server. */
  initialAttendance: Record<number, Status>;
  /** Learners excused today by an excuse slip: settled, so their row is read-only. */
  excused: Set<number>;
  /** Learners who started an activity today: they were in class, so only Present is accepted. */
  startedToday: Set<number>;
  /** Today's class was ended — the record is frozen. */
  classEndedToday: boolean;
  /** Reloads the classroom after a save. */
  onSaved: () => void;
  /** Reloads the classroom after a refused save, so startedToday catches up without touching unsaved marks. */
  onRefresh: () => void;
}

export default function AttendanceModal({
  open,
  onOpenChange,
  sectionId,
  learners,
  initialAttendance,
  excused,
  startedToday,
  classEndedToday,
  onSaved,
  onRefresh,
}: AttendanceModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      title="Attendance"
      subtitle="Mark each learner present, late, or absent for today."
      headerId="attendance-modal-title"
      panelClassName="max-h-[85vh] max-h-[85dvh] flex flex-col"
    >
        <AttendanceForm
          sectionId={sectionId}
          learners={learners}
          initialAttendance={initialAttendance}
          excused={excused}
          startedToday={startedToday}
          classEndedToday={classEndedToday}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onRefresh={onRefresh}
        />
    </ModalShell>
  );
}

function AttendanceForm({
  sectionId,
  learners,
  initialAttendance,
  excused,
  startedToday,
  classEndedToday,
  onOpenChange,
  onSaved,
  onRefresh,
}: {
  sectionId: number;
  learners: AttendanceLearner[];
  initialAttendance: Record<number, Status>;
  excused: Set<number>;
  startedToday: Set<number>;
  classEndedToday: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onRefresh: () => void;
}) {
  // Seeded once per open: this component only exists while the modal is open,
  // so closing unmounts it and reopening remounts with today's saved marks.
  // Deliberately not resynced from the page's 5s poll while open — a refresh
  // landing mid-edit must not overwrite marks the teacher is still setting.
  const [marks, setMarks] = useState<Record<number, Status>>(initialAttendance);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [unmarkedOnly, setUnmarkedOnly] = useState(false);

  // An excused learner counts as marked: the slip already settled the day.
  const markedCount = learners.filter((l) => marks[l.learnerId] || excused.has(l.learnerId)).length;
  // Started learners still marked Late or Absent (an old saved mark, or picked before they started) — the API would refuse the save.
  const needsPresent = learners.filter(
    (l) => startedToday.has(l.learnerId) && marks[l.learnerId] && marks[l.learnerId] !== "PRESENT"
  ).length;

  // What the teacher can currently see. Marking and saving always work off
  // the full roster — filtering narrows the view, never the record.
  const visible = useMemo(
    () =>
      learners.filter(
        (l) =>
          matchesLearnerSearch(l, search) && (!unmarkedOnly || !(marks[l.learnerId] || excused.has(l.learnerId)))
      ),
    [learners, search, unmarkedOnly, marks, excused]
  );
  const counts = useMemo(() => {
    const tally: Record<Status, number> = { PRESENT: 0, LATE: 0, ABSENT: 0 };
    for (const learner of learners) {
      const status = marks[learner.learnerId];
      if (status) tally[status] += 1;
    }
    return tally;
  }, [learners, marks]);

  // Acts on the visible rows only: with a filter applied, silently marking
  // learners the teacher cannot see would be a trap.
  function setAllVisible(status: Status) {
    setMarks((current) => ({
      ...current,
      ...Object.fromEntries(visible.filter((l) => !excused.has(l.learnerId)).map((l) => [l.learnerId, status])),
    }));
  }

  function handleSave() {
    const entries = learners
      .filter((l) => marks[l.learnerId])
      .map((l) => ({ learnerId: l.learnerId, status: marks[l.learnerId] }));

    if (entries.length === 0) {
      toast.error("Mark at least one learner first.");
      return;
    }

    startTransition(async () => {
      const result = await saveAttendance(sectionId, entries);
      if (result.success) {
        onSaved();
        toast.success(
          `Attendance saved for ${entries.length} ${entries.length === 1 ? "learner" : "learners"}.`
        );
        onOpenChange(false);
      } else {
        toast.error(result.error);
        // A learner may have started while the modal was open; refresh who did. Marks state is kept.
        onRefresh();
      }
    });
  }

  if (learners.length === 0) {
    return (
      <>
        <div className="px-6 py-10 text-center text-sm text-gray-600">
          No learners yet. Add a learner before taking attendance.
        </div>
        <Footer onClose={() => onOpenChange(false)} />
      </>
    );
  }

  return (
    <>
      {/* Find a learner + narrow to who is still unmarked */}
      <div className="flex flex-col gap-2 px-6 py-3 border-b border-gray-100 shrink-0 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search learner by name or LRN…"
            aria-label="Search learners"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-gray-500 focus:border-sidebar/40 focus:ring-2 focus:ring-sidebar/20"
          />
        </div>
        <button
          type="button"
          aria-pressed={unmarkedOnly}
          onClick={() => setUnmarkedOnly((v) => !v)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2 ${
            unmarkedOnly
              ? "border-sidebar bg-sidebar/10 text-sidebar"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Unmarked only
          {unmarkedOnly && ` (${learners.length - markedCount})`}
        </button>
      </div>

      {/* Bulk action + running tally */}
      <div className="flex items-center justify-between gap-3 px-6 py-2.5 border-b border-gray-100 shrink-0">
        <button
          type="button"
          onClick={() => setAllVisible("PRESENT")}
          disabled={classEndedToday || pending || visible.length === 0}
          className="text-xs font-semibold text-sidebar hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2 rounded"
        >
          {visible.length === learners.length || visible.length === 0
            ? "Mark all present"
            : `Mark ${visible.length} shown present`}
        </button>
        <p className="text-xs font-medium text-gray-600">
          {counts.PRESENT} present · {counts.LATE} late · {counts.ABSENT} absent
          {excused.size > 0 && ` · ${excused.size} excused`}
          <span className="text-gray-500"> · {learners.length - markedCount} unmarked</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            {unmarkedOnly && markedCount === learners.length
              ? "Every learner has been marked."
              : "No learner matches this search."}
          </p>
        )}
        {visible.map((learner) => {
          const middle = hasMiddleName(learner.middleName)
            ? ` ${middleInitial(learner.middleName)}`
            : "";
          const started = startedToday.has(learner.learnerId);
          const isExcused = excused.has(learner.learnerId);
          const needsFix = started && !!marks[learner.learnerId] && marks[learner.learnerId] !== "PRESENT";
          return (
            <div
              key={learner.learnerId}
              className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                needsFix ? "border-amber-300 bg-amber-50" : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getAvatarColor(learner.learnerId)}`}
                >
                  {getInitials(learner.firstName, learner.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {learner.lastName}, {learner.firstName}
                    {middle}
                  </p>
                  {isExcused && <p className="text-xs text-sky-700">Excused — slip logged for today.</p>}
                  {started && (
                    <p className={`text-xs ${needsFix ? "font-medium text-amber-700" : "text-gray-500"}`}>
                      {needsFix
                        ? "Activity started today — change to Present."
                        : "Activity started today — Present only."}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="grid grid-cols-3 gap-1 sm:flex sm:shrink-0"
                role="group"
                aria-label={`Attendance for ${learner.firstName}`}
              >
                {OPTIONS.map((option) => {
                  const selected = marks[learner.learnerId] === option.value;
                  const blocked = started && option.value !== "PRESENT";
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      title={blocked ? "Activity started today — Present only" : undefined}
                      disabled={classEndedToday || pending || blocked || isExcused}
                      onClick={() =>
                        setMarks((current) => ({ ...current, [learner.learnerId]: option.value }))
                      }
                      className={`inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2 ${
                        selected
                          ? option.active
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon size={13} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Footer
        onClose={() => onOpenChange(false)}
        onSave={handleSave}
        saveDisabled={classEndedToday || pending || markedCount === 0 || needsPresent > 0}
        pending={pending}
        note={
          classEndedToday
            ? "Today's class has ended — attendance is locked."
            : needsPresent > 0
              ? `Change ${needsPresent} ${needsPresent === 1 ? "learner" : "learners"} to Present before saving.`
              : undefined
        }
      />
    </>
  );
}

function Footer({
  onClose,
  onSave,
  saveDisabled,
  pending,
  note,
}: {
  onClose: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  pending?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
      <p className="text-xs text-amber-700">{note}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
        >
          Cancel
        </button>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d050d] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
          >
            {pending ? "Saving…" : "Save Attendance"}
          </button>
        )}
      </div>
    </div>
  );
}
