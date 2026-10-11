"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api";
import { VIDEO_ACCEPT, videoError } from "@/lib/validations/lessonSchema";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] bg-white ${err ? "border-red-400" : "border-gray-400"}`;

// Index + 1 is the API's day_of_week, Monday = 1.
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Lessons saved before days existed fall back to their position in the class schedule.
export const lessonDay = (dayOfWeek: number | null, fallback?: string) =>
  dayOfWeek ? WEEKDAYS[dayOfWeek - 1] : fallback;

export type CreatedLesson = {
  id: number;
  lessonName: string;
  description: string | null;
  videoUrl: string | null;
  moduleId: number;
  domainId: number;
  quarterId: number;
  quarterName: string;
  week: number;
  dayOfWeek: number | null;
  activityCount: number;
};

type FieldErrors = { moduleDomainId?: string; title?: string; description?: string; week?: string; day?: string; video?: string };

interface AddLessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: { id: number; moduleName: string; scheduleDays: { day: string }[]; domains: { id: number; name: string }[] };
  quarterId: number;
  quarterLabel: string;
  onCreated: (lesson: CreatedLesson) => void;
}

export default function AddLessonForm({
  open,
  onOpenChange,
  module,
  quarterId,
  quarterLabel,
  onCreated,
}: AddLessonFormProps) {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // onSubmit + fetch rather than a form action, so an API rejection leaves what the teacher typed and picked in place.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("quarter", String(quarterId));
    const video = formData.get("video");
    if (!(video instanceof File) || video.size === 0) formData.delete("video");
    else {
      const problem = videoError(video);
      if (problem) return setFieldErrors({ video: problem });
    }

    setPending(true);
    setFormError(null);
    try {
      const res = await apiFetch(`/api/modules/${module.id}/lessons`, { method: "POST", body: formData });
      if (res.ok) {
        toast.success("Lesson added!", { position: "top-center" });
        onCreated(await res.json());
        onOpenChange(false);
        return;
      }
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors({
          moduleDomainId: errors.moduleDomainId?.[0],
          title: errors.title?.[0],
          description: errors.description?.[0],
          week: errors.week?.[0],
          day: errors.day?.[0],
          video: errors.video?.[0],
        });
        setFormError(errors.quarter?.[0] ?? null);
      } else {
        setFormError("Could not add the lesson. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  const singleDomain = module.domains.length === 1 ? module.domains[0] : null;
  // Offer the module's class days; without a schedule, any school day.
  const scheduled = new Set(module.scheduleDays.map((sd) => sd.day.toUpperCase()));
  const dayOptions = WEEKDAYS.map((name, i) => ({ name, value: i + 1 })).filter((d) =>
    scheduled.size ? scheduled.has(d.name.toUpperCase()) : d.value <= 5,
  );

  return (
    <ModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      title="Add Lesson"
      subtitle={`${module.moduleName} • ${quarterLabel}`}
      headerId="add-lesson-title"
      maxWidth="max-w-md"
      headerPadding="px-5 py-3"
      titleSize="text-base"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
        {singleDomain ? (
          <input type="hidden" name="moduleDomainId" value={singleDomain.id} />
        ) : (
          <div>
            <label htmlFor="al-domain" className="block text-xs font-bold text-gray-700 mb-1.5">
              Domain <span className="text-red-500">*</span>
            </label>
            <select
              id="al-domain"
              name="moduleDomainId"
              required
              defaultValue=""
              aria-invalid={!!fieldErrors.moduleDomainId}
              className={inp(fieldErrors.moduleDomainId)}
            >
              <option value="" disabled>
                Select a domain
              </option>
              {module.domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.moduleDomainId && <p className="text-xs text-red-500 mt-1">{fieldErrors.moduleDomainId}</p>}
          </div>
        )}

        <div>
          <label htmlFor="al-title" className="block text-xs font-bold text-gray-700 mb-1.5">
            Lesson Title <span className="text-red-500">*</span>
          </label>
          <input
            id="al-title"
            name="title"
            required
            maxLength={150}
            placeholder="e.g. Vowel Aa"
            aria-invalid={!!fieldErrors.title}
            className={inp(fieldErrors.title)}
          />
          {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="al-week" className="block text-xs font-bold text-gray-700 mb-1.5">
              Week <span className="text-red-500">*</span>
            </label>
            <input
              id="al-week"
              name="week"
              type="number"
              required
              min={1}
              max={20}
              placeholder="e.g. 1"
              aria-invalid={!!fieldErrors.week}
              className={inp(fieldErrors.week)}
            />
            {fieldErrors.week && <p className="text-xs text-red-500 mt-1">{fieldErrors.week}</p>}
          </div>
          <div>
            <label htmlFor="al-day" className="block text-xs font-bold text-gray-700 mb-1.5">
              Day <span className="text-red-500">*</span>
            </label>
            <select
              id="al-day"
              name="day"
              required
              defaultValue=""
              aria-invalid={!!fieldErrors.day}
              className={inp(fieldErrors.day)}
            >
              <option value="" disabled>
                Select a day
              </option>
              {dayOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.day && <p className="text-xs text-red-500 mt-1">{fieldErrors.day}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="al-description" className="block text-xs font-bold text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            id="al-description"
            name="description"
            rows={3}
            maxLength={2000}
            aria-invalid={!!fieldErrors.description}
            className={inp(fieldErrors.description)}
          />
          {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
        </div>

        <div>
          <label htmlFor="al-video" className="block text-xs font-bold text-gray-700 mb-1.5">
            Lesson Video
          </label>
          <input
            id="al-video"
            name="video"
            type="file"
            accept={VIDEO_ACCEPT}
            aria-invalid={!!fieldErrors.video}
            aria-describedby="al-video-hint"
            className={`${inp(fieldErrors.video)} file:mr-3 file:rounded-lg file:border-0 file:bg-[#5b0610]/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#5b0610]`}
          />
          <p id="al-video-hint" className="text-xs text-gray-500 mt-1">
            MP4, WebM or MOV, up to 200 MB.
          </p>
          {fieldErrors.video && <p className="text-xs text-red-500 mt-1">{fieldErrors.video}</p>}
        </div>

        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 text-sm border-gray-400"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm"
          >
            {pending ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
