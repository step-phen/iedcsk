"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Lock, Pencil, Trash2, Upload, Video } from "lucide-react";
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
import { apiFetch, apiUpload } from "@/lib/api";
import { VIDEO_ACCEPT, videoError } from "@/lib/validations/lessonSchema";
import { CONTENT_HAS_RECORDS_HINT, QUARTER_LOCKED_HINT } from "@/lib/utils";
import { quarterLockedError } from "@/hooks/useActiveSchoolYear";
import { lessonDay } from "./add-lesson-form";

type WeekLesson = {
  id: number;
  lessonName: string;
  description: string | null;
  videoUrl: string | null;
  dayOfWeek: number | null;
  hasRecords: boolean;
};

async function uploadLessonVideo(
  lessonId: number,
  file: File,
  onProgress: (percent: number) => void,
  onProtected: () => void,
): Promise<string> {
  const body = new FormData();
  body.set("video", file);
  const res = await apiUpload(`/api/lessons/${lessonId}/video`, body, onProgress);
  if (res.status === 422) {
    const { errors } = (await res.json()) as { errors: Record<string, string[]> };
    if (errors.protected) onProtected();
    throw new Error(errors.video?.[0] ?? quarterLockedError(errors) ?? errors.protected?.[0] ?? "The video could not be added.");
  }
  if (!res.ok) throw new Error("The video could not be added. Please try again.");
  return ((await res.json()) as { videoUrl: string }).videoUrl;
}

interface UpdateLessonsModalProps {
  onClose: () => void;
  moduleName: string;
  week: number;
  /** Fallback for lessons saved without a day: the week's nth lesson is taught on the nth class day. */
  days: string[];
  lessons: WeekLesson[];
  onLessonChanged: (lessonId: number, changes: Partial<WeekLesson>) => void;
  /** The quarter is active for classes: lessons and videos can be viewed but not changed. */
  readOnly?: boolean;
}

/** One description shared by a topic's day-rows (Tue/Thu are the same lesson), saved to each underlying row. */
function DescriptionEditor({
  lessons,
  onSaved,
  locked,
  onProtected,
}: {
  lessons: WeekLesson[];
  onSaved: (lessonId: number, description: string | null) => void;
  /** Why it can't be edited (active quarter or records), or null. */
  locked: string | null;
  onProtected: () => void;
}) {
  const shared = lessons[0]?.description ?? "";
  const [draft, setDraft] = useState(shared);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = !locked && draft.trim() !== shared;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const results = await Promise.all(
        lessons.map((l) => apiFetch(`/api/lessons/${l.id}`, { method: "PATCH", body: JSON.stringify({ description: draft }) })),
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        if (failed.status === 422) {
          const { errors } = (await failed.json()) as { errors: Record<string, string[]> };
          if (errors.protected) onProtected();
          setError(errors.description?.[0] ?? quarterLockedError(errors) ?? errors.protected?.[0] ?? "The description could not be saved.");
        } else {
          setError("The description could not be saved. Please try again.");
        }
        return;
      }
      const saved = await Promise.all(results.map((r) => r.json() as Promise<{ description: string | null }>));
      setDraft(saved[0]?.description ?? "");
      lessons.forEach((l, i) => onSaved(l.id, saved[i].description));
      toast.success("Description updated!", { position: "top-center" });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 w-full">
      <label htmlFor={`lesson-desc-${lessons[0]?.id}`} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-400">
        Description
      </label>
      <textarea
        id={`lesson-desc-${lessons[0]?.id}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        maxLength={2000}
        readOnly={!!locked}
        title={locked ?? undefined}
        placeholder={locked ? "No description" : "Add a description learners will see with this lesson"}
        aria-invalid={!!error}
        className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-xs leading-relaxed text-stone-700 outline-none transition-colors focus:border-sidebar focus:ring-2 focus:ring-sidebar/10 ${error ? "border-red-400" : "border-stone-200"}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {changed && (
        <div className="mt-1.5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(shared);
              setError(null);
            }}
            className="rounded-full px-3 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-200/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-sidebar px-3 py-1 text-xs font-semibold text-white hover:bg-sidebar/90 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </form>
  );
}

/** One name shared by a topic's day-rows (Tue/Thu are the same lesson), saved to each underlying row. */
function LessonNameEditor({
  lessons,
  onSaved,
  locked,
  onProtected,
}: {
  lessons: WeekLesson[];
  onSaved: (lessonId: number, lessonName: string) => void;
  /** Why it can't be edited (active quarter or records), or null. */
  locked: string | null;
  onProtected: () => void;
}) {
  const shared = lessons[0]?.lessonName ?? "";
  const [draft, setDraft] = useState(shared);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = !locked && draft.trim() !== shared && draft.trim() !== "";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const results = await Promise.all(
        lessons.map((l) => apiFetch(`/api/lessons/${l.id}`, { method: "PATCH", body: JSON.stringify({ title: draft.trim() }) })),
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        if (failed.status === 422) {
          const { errors } = (await failed.json()) as { errors: Record<string, string[]> };
          if (errors.protected) onProtected();
          setError(errors.title?.[0] ?? quarterLockedError(errors) ?? errors.protected?.[0] ?? "The lesson name could not be saved.");
        } else {
          setError("The lesson name could not be saved. Please try again.");
        }
        return;
      }
      const saved = await Promise.all(results.map((r) => r.json() as Promise<{ title: string }>));
      setDraft(saved[0].title);
      lessons.forEach((l, i) => onSaved(l.id, saved[i].title));
      toast.success("Lesson name updated!", { position: "top-center" });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <label htmlFor={`lesson-name-${lessons[0]?.id}`} className="sr-only">
        Name of lesson
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id={`lesson-name-${lessons[0]?.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={150}
          readOnly={!!locked}
          title={locked ?? undefined}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-transparent py-1 pl-2 pr-7 text-sm font-bold text-stone-900 outline-none transition-colors focus:bg-white focus:border-sidebar focus:ring-2 focus:ring-sidebar/10 ${error ? "border-red-400" : "border-transparent hover:border-stone-300"}`}
        />
        {!locked && (
          <Pencil size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-300" aria-hidden />
        )}
      </div>
      {changed && (
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-sidebar px-2.5 py-1 text-xs font-semibold text-white hover:bg-sidebar/90 disabled:opacity-60"
        >
          {pending ? "..." : "Save"}
        </button>
      )}
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </form>
  );
}

/** Lists one week's lessons so each can get a video or an edited description. */
export default function UpdateLessonsModal({
  onClose,
  moduleName,
  week,
  days,
  lessons,
  onLessonChanged,
  readOnly = false,
}: UpdateLessonsModalProps) {
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  // The lesson waiting on the Remove Video confirmation.
  const [removing, setRemoving] = useState<WeekLesson | null>(null);
  const [removePending, setRemovePending] = useState(false);

  async function removeVideo(lesson: WeekLesson) {
    setRemovePending(true);
    try {
      const res = await apiFetch(`/api/lessons/${lesson.id}/video`, { method: "DELETE" });
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        if (errors.protected) onLessonChanged(lesson.id, { hasRecords: true });
        const locked = quarterLockedError(errors) ?? errors.protected?.[0];
        if (locked) {
          toast.error(locked, { position: "top-center" });
          return;
        }
      }
      if (!res.ok) throw new Error(`DELETE video failed: ${res.status}`);
      // Back to no video, so the lesson shows Add Video for the replacement.
      onLessonChanged(lesson.id, { videoUrl: null });
      toast.success("Video removed. You can upload a new one.", { position: "top-center" });
    } catch (error) {
      console.error("[UpdateLessonsModal]", error);
      toast.error("The video could not be removed. Please try again.", { position: "top-center" });
    } finally {
      setRemovePending(false);
      setRemoving(null);
    }
  }

  async function handleVideoPicked(lessonId: number, file: File | undefined) {
    if (!file) return;
    const problem = videoError(file);
    if (problem) {
      toast.error(problem, { position: "top-center" });
      return;
    }
    setUploadingId(lessonId);
    setProgress(0);
    try {
      onLessonChanged(lessonId, {
        videoUrl: await uploadLessonVideo(lessonId, file, setProgress, () => onLessonChanged(lessonId, { hasRecords: true })),
      });
      toast.success("Video added!", { position: "top-center" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The video could not be added.", {
        position: "top-center",
      });
    } finally {
      setUploadingId(null);
    }
  }

  // Same order as the API: the active quarter's reason first, then records.
  const lockReason = (hasRecords: boolean) => (readOnly ? QUARTER_LOCKED_HINT : hasRecords ? CONTENT_HAS_RECORDS_HINT : null);

  // Grouped by topic (same lesson name = same topic taught on different days), in the order lessons already arrive.
  const labeled = lessons.map((lesson, i) => ({ ...lesson, day: lessonDay(lesson.dayOfWeek, days[i]) ?? "" }));
  const topics: { lessonName: string; entries: (WeekLesson & { day: string })[] }[] = [];
  labeled.forEach((lesson) => {
    const topic = topics.find((t) => t.lessonName.trim().toLowerCase() === lesson.lessonName.trim().toLowerCase());
    if (topic) topic.entries.push(lesson);
    else topics.push({ lessonName: lesson.lessonName, entries: [lesson] });
  });

  return (
    <ModalShell
      open
      onClose={onClose}
      title={readOnly ? `${moduleName} — Week ${week}` : `Update ${moduleName} — Week ${week}`}
      subtitle={
        readOnly
          ? "View only: this quarter is active for classes. Activate another quarter to edit its lessons."
          : "Edit descriptions, or add, remove and replace lesson videos."
      }
      headerId="update-lessons-title"
      maxWidth="max-w-xl"
      headerPadding="px-5 py-3"
      titleSize="text-base"
      panelClassName="max-h-[85vh] flex flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="space-y-5">
          {topics.map((topic) => {
            // Name and description are shared by the topic's day-rows, so one row with records locks both.
            const topicLock = lockReason(topic.entries.some((e) => e.hasRecords));
            const markProtected = () => topic.entries.forEach((e) => onLessonChanged(e.id, { hasRecords: true }));
            return (
            <section key={topic.entries[0].id} className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
              <LessonNameEditor
                lessons={topic.entries}
                onSaved={(lessonId, lessonName) => onLessonChanged(lessonId, { lessonName })}
                locked={topicLock}
                onProtected={markProtected}
              />
              {topicLock === CONTENT_HAS_RECORDS_HINT && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
                  <Lock size={12} aria-hidden="true" className="shrink-0" />
                  {CONTENT_HAS_RECORDS_HINT}
                </p>
              )}
              <DescriptionEditor
                lessons={topic.entries}
                onSaved={(lessonId, description) => onLessonChanged(lessonId, { description })}
                locked={topicLock}
                onProtected={markProtected}
              />
              <div className="mt-3 space-y-2">
                {topic.entries.map((lesson) => (
                  <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
                    {lesson.day && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar/70">{lesson.day}</span>
                    )}
                    {lesson.videoUrl ? (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                        {/* Icon-only actions; aria-label names them for screen readers and title shows it on hover. */}
                        <a
                          href={lesson.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Watch video of ${lesson.lessonName}`}
                          title="Watch video"
                          className="inline-flex size-8 items-center justify-center rounded-full text-sidebar hover:bg-sidebar/10 outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
                        >
                          <Video size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setRemoving(lesson)}
                          disabled={uploadingId !== null || !!lockReason(lesson.hasRecords)}
                          aria-label={`Remove video of ${lesson.lessonName}`}
                          title={lockReason(lesson.hasRecords) ?? "Remove video"}
                          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </span>
                    ) : uploadingId === lesson.id ? (
                      <div className="ml-auto flex w-40 shrink-0 flex-col gap-1">
                        <span className="inline-flex items-center justify-between gap-1.5 text-xs font-semibold text-stone-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            {/* At 100% the file is sent and the server is still saving it. */}
                            {progress < 100 ? "Uploading..." : "Saving..."}
                          </span>
                          <span className="tabular-nums text-sidebar">{progress}%</span>
                        </span>
                        <div
                          role="progressbar"
                          aria-label={`Uploading video for ${lesson.lessonName}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
                        >
                          <div className="h-full rounded-full bg-sidebar transition-[width] duration-200" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <label
                        title={lockReason(lesson.hasRecords) ?? undefined}
                        className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sidebar/30 bg-white px-3 py-1 text-xs font-semibold text-sidebar focus-within:ring-2 focus-within:ring-sidebar/40 ${lockReason(lesson.hasRecords) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-sidebar/10"}`}
                      >
                        <Upload size={13} />
                        Add Video
                        <input
                          type="file"
                          accept={VIDEO_ACCEPT}
                          className="sr-only"
                          disabled={uploadingId !== null || !!lockReason(lesson.hasRecords)}
                          onChange={(e) => {
                            handleVideoPicked(lesson.id, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && !removePending && setRemoving(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Video?</AlertDialogTitle>
            <AlertDialogDescription>
              The video of {removing?.lessonName} will be deleted, and learners will not see it until you upload a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removePending}
              onClick={() => removing && removeVideo(removing)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {removePending ? "Removing..." : "Remove Video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModalShell>
  );
}
