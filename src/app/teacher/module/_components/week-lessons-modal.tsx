"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "react-hot-toast";
import { AlertTriangle, ClipboardList, Loader2, Lock, Pencil, Trash2, Upload, Video } from "lucide-react";
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
import { apiFetch, apiUpload } from "@/lib/api";
import { CONTENT_HAS_RECORDS_HINT, PRACTICAL_VIDEO_REQUIRED_HINT } from "@/lib/utils";
import { VIDEO_ACCEPT, videoError } from "@/lib/validations/lessonSchema";
import { quarterLockedError } from "@/hooks/useActiveSchoolYear";
import PracticalActivityForm, { type WeekActivity } from "./practical-activity-form";
import { lessonDay } from "./add-lesson-form";

const ACTIVITY_CHIP = "bg-sidebar/10 text-sidebar";

type WeekLessonData = {
  lessonId: number;
  lessonName: string;
  dayOfWeek: number | null;
  activities: WeekActivity[];
};

type LessonActivity = { lessonId: number; activity: WeekActivity };

const CARD_BUTTON =
  "inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-50";

const FORMAT_LABEL = { digital: "Digital", practical: "Practical" } as const;

async function getWeekLessons(
  moduleId: number,
  quarter: number,
  week: number,
): Promise<WeekLessonData[]> {
  const res = await apiFetch(
    `/api/modules/${moduleId}/lessons?quarter=${quarter}&week=${week}`,
  );
  if (!res.ok) throw new Error(`GET week lessons failed: ${res.status}`);
  return res.json();
}

interface WeekLessonsModalProps {
  open: boolean;
  onClose: () => void;
  moduleName: string;
  moduleId: number;
  quarter: number;
  week: number;
  /** Opened from one topic's card — narrows the grid and the "Add" form to that topic's day-rows. */
  lessonIds?: number[];
  /** Runs after an activity is added (+1) or deleted (-1), so the board's activity count can follow. */
  onActivityCountChange?: (lessonId: number, delta: number) => void;
  /** Why the quarter is view-only (active or completed): activities can be viewed but not added, edited or deleted. */
  quarterLock?: string | null;
  /** The active quarter: still view-only, except Add Video on practical activities that have none (an attached one stays). */
  firstVideoOnly?: boolean;
  /** Opened from the board's "+ Practical Activity": shows only the new-activity form, and closes when it's done. */
  adding?: boolean;
}

/** Flat activities grid for the week — no per-lesson grouping, the "Open"
 *  card stays on the module board instead of navigating to the lesson page. */
export default function WeekLessonsModal({
  open,
  onClose,
  moduleName,
  moduleId,
  quarter,
  week,
  lessonIds,
  onActivityCountChange,
  quarterLock = null,
  firstVideoOnly = false,
  adding = false,
}: WeekLessonsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<WeekLessonData[]>([]);
  const visibleLessons = lessonIds?.length ? lessons.filter((l) => lessonIds.includes(l.lessonId)) : lessons;
  const activities = visibleLessons.flatMap((l) =>
    l.activities.map((activity) => ({ lessonId: l.lessonId, activity, day: lessonDay(l.dayOfWeek) })),
  );
  // The form takes the modal's body while open, instead of stacking a second modal: "new" adds, an activity edits.
  const [form, setForm] = useState<"new" | LessonActivity | null>(adding ? "new" : null);
  const [deleting, setDeleting] = useState<LessonActivity | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Same order as the API: the quarter's reason first, then records.
  const lockFor = (activity: WeekActivity) => quarterLock ?? (activity.hasRecords ? CONTENT_HAS_RECORDS_HINT : null);
  // A first demo video: the active quarter allows it even on an activity already used (the API checks the same).
  const videoLockFor = (activity: WeekActivity) => (firstVideoOnly ? null : lockFor(activity));
  // The API refused a change because the activity now has records: lock its card to match.
  const markProtected = (activityId: number) =>
    setLessons((prev) => prev.map((l) => ({ ...l, activities: l.activities.map((a) => (a.id === activityId ? { ...a, hasRecords: true } : a)) })));
  // activityId => upload percent, one entry per demo video still uploading.
  const [uploads, setUploads] = useState<Record<number, number>>({});

  // The card only changes from the server's answer: a picked file is not a saved video.
  async function attachVideo(activity: WeekActivity, file: File | undefined) {
    if (!file) return;
    const problem = videoError(file);
    if (problem) {
      toast.error(problem, { position: "top-center" });
      return;
    }
    const setProgress = (percent: number) => setUploads((u) => ({ ...u, [activity.id]: percent }));
    setProgress(0);
    try {
      const body = new FormData();
      body.set("video", file);
      const res = await apiUpload(`/api/practical-activities/${activity.id}/video`, body, setProgress);
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        if (errors.protected) markProtected(activity.id);
        throw new Error(errors.video?.[0] ?? quarterLockedError(errors) ?? errors.protected?.[0]);
      }
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as WeekActivity;
      setLessons((prev) => prev.map((l) => ({ ...l, activities: l.activities.map((a) => (a.id === saved.id ? saved : a)) })));
      toast.success("Video added! Learners can start this activity now.", { position: "top-center" });
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "The video could not be added. Please try again.", {
        position: "top-center",
      });
    } finally {
      setUploads((u) => {
        const rest = { ...u };
        delete rest[activity.id];
        return rest;
      });
    }
  }

  async function deleteActivity({ lessonId, activity }: LessonActivity) {
    setDeletePending(true);
    try {
      const res = await apiFetch(`/api/practical-activities/${activity.id}`, { method: "DELETE" });
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        if (errors.protected) markProtected(activity.id);
        throw new Error(quarterLockedError(errors) ?? Object.values(errors)[0]?.[0]);
      }
      if (!res.ok) throw new Error();
      setLessons((prev) => prev.map((l) => (l.lessonId === lessonId ? { ...l, activities: l.activities.filter((a) => a.id !== activity.id) } : l)));
      onActivityCountChange?.(lessonId, -1);
      toast.success("Practical activity deleted.", { position: "top-center" });
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "The activity could not be deleted. Please try again.", { position: "top-center" });
    } finally {
      setDeletePending(false);
      setDeleting(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-mount flag for SSR-safe portal, must run post-mount
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getWeekLessons(moduleId, quarter, week)
      .catch((error) => {
        // An empty grid reads as "No activities found" rather than spinning forever.
        console.error("[WeekLessonsModal]", error);
        return [];
      })
      .then((data) => {
        if (!cancelled) {
          setLessons(data);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, moduleId, quarter, week]);

  if (!mounted) return null;

  return createPortal(
    <ModalShell
      open={open}
      onClose={onClose}
      title={adding ? `${moduleName} — Week ${week}` : lessonIds?.length ? (visibleLessons[0]?.lessonName ?? moduleName) : `${moduleName} — Week ${week}`}
      headerId="week-lessons-title"
      // The form needs less room than the activity grid.
      maxWidth={form ? "max-w-lg" : "max-w-3xl"}
      panelClassName="max-h-[85vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        {/* The new-activity form waits for the week's lessons, so its lesson picker is never empty. */}
        {form && !(form === "new" && loading) ? (
          <PracticalActivityForm
            // Keyed so switching between activities starts the form fresh.
            key={form === "new" ? "new" : form.activity.id}
            lessons={visibleLessons}
            editing={form === "new" ? undefined : form}
            onCancel={() => (adding ? onClose() : setForm(null))}
            onProtected={() => form !== "new" && markProtected(form.activity.id)}
            onSaved={(lessonId, saved) => {
              setLessons((prev) =>
                prev.map((l) =>
                  l.lessonId !== lessonId
                    ? l
                    : form === "new"
                      ? { ...l, activities: [...l.activities, saved] }
                      : { ...l, activities: l.activities.map((a) => (a.id === saved.id ? saved : a)) },
                ),
              );
              if (form === "new") onActivityCountChange?.(lessonId, 1);
              if (adding) onClose();
              else setForm(null);
            }}
          />
        ) : (
        <>
          {!loading && (
            <p className="mb-4 text-xs text-stone-500">
              {visibleLessons.length === 0
                ? "Add a lesson for this week first, then add activities to it."
                : "Games and practical activities for this lesson. Add a practical activity from the week's + Practical Activity button."}
            </p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
              <ClipboardList size={28} className="mb-3 text-stone-300" />
              No activities found for this lesson.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activities.map(({ lessonId, activity, day }) => (
                <div
                  key={activity.id}
                  className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900 leading-snug">
                      {activity.activityName}
                    </p>
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ACTIVITY_CHIP}`}
                    >
                      {FORMAT_LABEL[activity.format]}
                    </span>
                  </div>
                  {(day || (activity.format === "practical" && activity.demoVideoReady)) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {day && (
                        <span className="text-[10px] font-bold tracking-wider text-sidebar uppercase bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                          {day}
                        </span>
                      )}
                      {/* Same chip as a lesson's video on the board; only a saved, reachable demo counts. */}
                      {activity.format === "practical" && activity.demoVideoReady && (
                        <span
                          title="Has demonstration video"
                          className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-sky-700 uppercase bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded"
                        >
                          <Video size={11} aria-hidden="true" />
                          Video
                        </span>
                      )}
                    </div>
                  )}
                  {(activity.description ?? activity.instructions) && (
                    <p className="text-xs text-stone-600 leading-snug line-clamp-3">
                      {activity.description ?? activity.instructions}
                    </p>
                  )}
                  {/* Only the teacher's own practical activities can be changed; digital games come with the system. */}
                  {activity.format === "practical" && !activity.demoVideoReady && (
                    <p className="flex items-start gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-snug text-amber-800">
                      <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                      {PRACTICAL_VIDEO_REQUIRED_HINT}
                    </p>
                  )}
                  {activity.format === "practical" && !activity.demoVideoUrl && (
                    activity.id in uploads ? (
                      <span
                        role="progressbar"
                        aria-label={`Uploading video for ${activity.activityName}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={uploads[activity.id]}
                        className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-stone-500"
                      >
                        <Loader2 size={12} className="animate-spin" />
                        {/* At 100% the file is sent and the server is still saving it. */}
                        {uploads[activity.id] < 100 ? `Uploading... ${uploads[activity.id]}%` : "Saving..."}
                      </span>
                    ) : (
                      <label
                        title={videoLockFor(activity) ?? undefined}
                        className={`inline-flex h-7 self-start items-center gap-1 rounded-lg border border-sidebar/30 bg-white px-2 text-[11px] font-semibold text-sidebar transition-colors focus-within:ring-2 focus-within:ring-sidebar/30 ${videoLockFor(activity) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-sidebar/10"}`}
                      >
                        <Upload size={12} aria-hidden="true" />
                        Add Video
                        <input
                          type="file"
                          accept={VIDEO_ACCEPT}
                          className="sr-only"
                          disabled={!!videoLockFor(activity)}
                          onChange={(e) => {
                            attachVideo(activity, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )
                  )}
                  {activity.format === "practical" && lockFor(activity) === CONTENT_HAS_RECORDS_HINT && (
                    <p className="mt-auto flex items-start gap-1 text-[11px] leading-snug text-stone-500">
                      <Lock size={11} aria-hidden="true" className="mt-0.5 shrink-0" />
                      {CONTENT_HAS_RECORDS_HINT}
                    </p>
                  )}
                  {activity.format === "practical" && (
                    <div className="mt-auto flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setForm({ lessonId, activity })}
                        disabled={!!lockFor(activity)}
                        title={lockFor(activity) ?? undefined}
                        className={`${CARD_BUTTON} border-stone-300 bg-white text-stone-700 hover:border-sidebar hover:text-sidebar`}
                      >
                        <Pencil size={12} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting({ lessonId, activity })}
                        disabled={!!lockFor(activity)}
                        title={lockFor(activity) ?? undefined}
                        className={`${CARD_BUTTON} border-red-200 bg-white text-red-600 hover:bg-red-50`}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
        )}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !deletePending && setDeleting(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Practical Activity?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.activity.activityName} will no longer appear in lessons or classes, and checklist skills linked to it will be
              unlinked. Results learners already have are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={() => deleting && deleteActivity(deleting)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModalShell>,
    document.body,
  );
}
