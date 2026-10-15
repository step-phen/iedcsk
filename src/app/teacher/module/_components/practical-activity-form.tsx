"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { apiUpload } from "@/lib/api";
import { quarterLockedError } from "@/hooks/useActiveSchoolYear";
import { VIDEO_ACCEPT, videoError } from "@/lib/validations/lessonSchema";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] bg-white ${err ? "border-red-400" : "border-gray-400"}`;

/** One activity card in the week view; practical ones carry what the edit form needs. */
export type WeekActivity = {
  id: number;
  activityName: string;
  description: string | null;
  format: "digital" | "practical";
  instructions?: string;
  teacherGuidelines?: string;
  demoVideoUrl?: string | null;
  /** Used in a class or by a learner (API rule): viewable, never changed again. */
  hasRecords: boolean;
};

type FieldErrors = { lesson?: string; name?: string; description?: string; instructions?: string; teacherGuidelines?: string; video?: string };

/** The teacher's own practical activity: a demonstration video for learners, what they do, and what the teacher rates. */
export default function PracticalActivityForm({
  lessons,
  editing,
  onCancel,
  onSaved,
  onProtected,
}: {
  lessons: { lessonId: number; lessonName: string }[];
  /** The activity being edited and its lesson; left out to add a new one. */
  editing?: { lessonId: number; activity: WeekActivity };
  onCancel: () => void;
  onSaved: (lessonId: number, activity: WeekActivity) => void;
  /** The API refused the edit because the activity now has records. */
  onProtected?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // onSubmit + upload rather than a form action, so an API rejection leaves what the teacher typed in place.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const lessonId = editing?.lessonId ?? Number(formData.get("lessonId"));
    formData.delete("lessonId");
    if (!lessonId) return setFieldErrors({ lesson: "Pick the lesson this activity belongs to." });
    const video = formData.get("video");
    if (video instanceof File && video.size > 0) {
      const problem = videoError(video);
      if (problem) return setFieldErrors({ video: problem });
    } else formData.delete("video");

    setPending(true);
    setProgress(0);
    setFieldErrors({});
    setFormError(null);
    try {
      const path = editing ? `/api/practical-activities/${editing.activity.id}` : `/api/lessons/${lessonId}/practical-activities`;
      const res = await apiUpload(path, formData, setProgress);
      if (res.ok) {
        toast.success(editing ? "Practical activity saved!" : "Practical activity added!", { position: "top-center" });
        onSaved(lessonId, await res.json());
        return;
      }
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors({
          name: errors.name?.[0],
          description: errors.description?.[0],
          instructions: errors.instructions?.[0],
          teacherGuidelines: errors.teacherGuidelines?.[0],
          video: errors.video?.[0],
        });
        if (errors.protected) onProtected?.();
        setFormError(quarterLockedError(errors) ?? errors.protected?.[0] ?? null);
      } else {
        setFormError(`Could not ${editing ? "save" : "add"} the activity. Please try again.`);
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-stone-900">{editing ? "Edit practical activity" : "New practical activity"}</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Learners watch your demonstration video, then do the activity in class. You rate each learner afterwards.
        </p>
      </div>

      {!editing && lessons.length === 1 && <input type="hidden" name="lessonId" value={lessons[0].lessonId} />}
      {!editing && lessons.length > 1 && (
        <div>
          <label htmlFor="pa-lesson" className="block text-xs font-bold text-gray-700 mb-1.5">
            Lesson <span className="text-red-500">*</span>
          </label>
          <select
            id="pa-lesson"
            name="lessonId"
            defaultValue=""
            aria-invalid={!!fieldErrors.lesson}
            className={inp(fieldErrors.lesson)}
          >
            <option value="" disabled>
              Select a lesson
            </option>
            {lessons.map((l) => (
              <option key={l.lessonId} value={l.lessonId}>
                {l.lessonName}
              </option>
            ))}
          </select>
          {fieldErrors.lesson && <p className="text-xs text-red-500 mt-1">{fieldErrors.lesson}</p>}
        </div>
      )}

      <div>
        <label htmlFor="pa-name" className="block text-xs font-bold text-gray-700 mb-1.5">
          Activity Name <span className="text-red-500">*</span>
        </label>
        <input
          id="pa-name"
          name="name"
          maxLength={150}
          defaultValue={editing?.activity.activityName}
          placeholder="e.g. Hop on one foot"
          aria-invalid={!!fieldErrors.name}
          className={inp(fieldErrors.name)}
        />
        {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="pa-description" className="block text-xs font-bold text-gray-700 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="pa-description"
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={editing?.activity.description ?? undefined}
          placeholder="e.g. Balance practice using one foot."
          aria-invalid={!!fieldErrors.description}
          className={inp(fieldErrors.description)}
        />
        {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
      </div>

      <div>
        <label htmlFor="pa-instructions" className="block text-xs font-bold text-gray-700 mb-1.5">
          What learners do <span className="text-red-500">*</span>
        </label>
        <textarea
          id="pa-instructions"
          name="instructions"
          rows={2}
          maxLength={1000}
          defaultValue={editing?.activity.instructions}
          placeholder="e.g. Hop five times on your left foot, then on your right."
          aria-invalid={!!fieldErrors.instructions}
          className={inp(fieldErrors.instructions)}
        />
        {fieldErrors.instructions && <p className="text-xs text-red-500 mt-1">{fieldErrors.instructions}</p>}
      </div>

      <div>
        <label htmlFor="pa-guidelines" className="block text-xs font-bold text-gray-700 mb-1.5">
          What you look for when rating <span className="text-red-500">*</span>
        </label>
        <textarea
          id="pa-guidelines"
          name="teacherGuidelines"
          rows={3}
          maxLength={1000}
          defaultValue={editing?.activity.teacherGuidelines}
          placeholder={"e.g. Very Good: five hops without falling.\nGood: needs a hand once.\nNeeds Help: cannot balance yet."}
          aria-invalid={!!fieldErrors.teacherGuidelines}
          className={inp(fieldErrors.teacherGuidelines)}
        />
        {fieldErrors.teacherGuidelines && <p className="text-xs text-red-500 mt-1">{fieldErrors.teacherGuidelines}</p>}
      </div>

      <div>
        <label htmlFor="pa-video" className="block text-xs font-bold text-gray-700 mb-1.5">
          Demonstration Video
        </label>
        <input
          id="pa-video"
          name="video"
          type="file"
          accept={VIDEO_ACCEPT}
          aria-invalid={!!fieldErrors.video}
          aria-describedby="pa-video-hint"
          className={`${inp(fieldErrors.video)} file:mr-3 file:rounded-lg file:border-0 file:bg-[#5b0610]/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#5b0610]`}
        />
        <p id="pa-video-hint" className="text-xs text-gray-500 mt-1">
          {editing?.activity.demoVideoUrl
            ? "Leave empty to keep the current video. "
            : "Optional — you can add it later by editing this activity. "}
          MP4, WebM or MOV, up to 200 MB.
          {editing?.activity.demoVideoUrl && (
            <>
              {" "}
              <a href={editing.activity.demoVideoUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#5b0610] underline">
                Watch current video
              </a>
            </>
          )}
        </p>
        {fieldErrors.video && <p className="text-xs text-red-500 mt-1">{fieldErrors.video}</p>}
      </div>

      {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        {pending && (
          <span className="mr-auto text-xs font-semibold text-stone-600 tabular-nums" aria-live="polite">
            Uploading video… {progress}%
          </span>
        )}
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="h-10 px-6 text-sm border-gray-400">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm">
          {pending ? "Saving..." : editing ? "Save" : "Add Activity"}
        </Button>
      </div>
    </form>
  );
}
