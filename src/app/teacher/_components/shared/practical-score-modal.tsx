"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { PRACTICAL_RESULT_MAX, PRACTICAL_RESULT_VALUES, type PracticalResultValue, type PracticalRatingStatus, type ScoreBand } from "@/constants/enums";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api";
import { ratingBand } from "@/lib/score-band";

// Ratings are saved against the section's classes, so a card without a section can't rate.
async function submitPracticalRating(
  sectionId: number | undefined,
  input: { learnerId: number; activityId: number; result: PracticalResultValue; remarks?: string },
): Promise<{ success: true } | { success: false; error: string }> {
  if (sectionId === undefined) return { success: false, error: "Rate practical activities from the Classroom page." };
  try {
    const res = await apiFetch(`/api/sections/${sectionId}/classroom/practical-rating`, { method: "PUT", body: JSON.stringify(input) });
    if (res.ok) return { success: true };
    if (res.status === 422) {
      const { errors } = (await res.json()) as { errors: Record<string, string[]> };
      return { success: false, error: Object.values(errors)[0]?.[0] ?? "Could not save the rating." };
    }
    return { success: false, error: "Could not save the rating. Please try again." };
  } catch {
    return { success: false, error: "Could not reach the server. Please try again." };
  }
}

/** A picked rating takes its band's color, red (1–2) to green (4–5). */
const ACTIVE_CLASS: Record<ScoreBand, string> = {
  needs_help: "bg-rose-600 text-white border-rose-600",
  good: "bg-amber-500 text-white border-amber-500",
  very_good: "bg-emerald-600 text-white border-emerald-600",
};

interface PracticalScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerId: number;
  learnerName: string;
  activityId: number;
  activityName: string;
  /** Already-saved rating, if any — NOT_RATED highlights nothing and starts the textarea empty. */
  initialStatus: PracticalRatingStatus;
  initialRemarks: string | null;
  /** The class's section; the rating is saved through it. */
  sectionId?: number;
  /** Runs after a successful save, e.g. to reload the classroom. */
  onSaved?: () => void;
}

/**
 * The teacher's Practical Demonstration scoring form. Opened from the
 * learner card's "Score" button — no rating UI lives on the card itself.
 *
 * Deliberately a manual select-then-Save flow (unlike the old inline
 * control's save-on-click), since a modal loses the immediate-feedback
 * affordance a card grid has room for.
 */
export default function PracticalScoreModal({
  open,
  onOpenChange,
  learnerId,
  learnerName,
  activityId,
  activityName,
  initialStatus,
  initialRemarks,
  sectionId,
  onSaved,
}: PracticalScoreModalProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PracticalResultValue | null>(
    initialStatus === "NOT_RATED" ? null : initialStatus
  );
  const [remarks, setRemarks] = useState(initialRemarks ?? "");
  const [pending, startTransition] = useTransition();

  // createPortal needs document.body, which doesn't exist during SSR — this
  // component can be server-rendered whenever a learner is actively awaiting
  // a rating (see learner-card.tsx's mount condition), so the portal must
  // wait for the client mount rather than running in the render body directly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-mount flag for SSR-safe portal, must run post-mount
    setMounted(true);
  }, []);

  // Re-sync from props on every open so a Cancel'd draft (unsaved selection
  // or remarks) doesn't linger and get shown as if it were the saved rating.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset local draft state from props whenever the modal opens
      setSelected(initialStatus === "NOT_RATED" ? null : initialStatus);
      setRemarks(initialRemarks ?? "");
    }
  }, [open, initialStatus, initialRemarks]);

  function handleSave() {
    if (!selected) {
      toast.error("Choose a performance rating first.");
      return;
    }
    startTransition(async () => {
      const outcome = await submitPracticalRating(sectionId, {
        learnerId,
        activityId,
        result: selected,
        remarks: remarks.trim() || undefined,
      });

      if (outcome.success) {
        toast.success("Result saved.");
        onSaved?.();
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(outcome.error);
      }
    });
  }

  if (!mounted) return null;

  // Portaled to document.body: the card this opens from has both
  // overflow-hidden and a hover:translate transform, and a transform on any
  // ancestor makes it the containing block for position:fixed descendants —
  // paired with overflow-hidden, that clips the modal into the card's box
  // for as long as the card stays hovered (i.e. right after the click that
  // opened it). Rendering in place made the modal look boxed inside the card.
  return createPortal(
    <ModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      title="Score Practical Demonstration"
      headerId="practical-score-title"
      maxWidth="max-w-md"
    >
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Learner</p>
            <p className="text-sm font-semibold text-gray-800">{learnerName}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Activity</p>
            <p className="text-sm font-semibold text-gray-800">{activityName}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Performance
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Performance rating, 1 to ${PRACTICAL_RESULT_MAX}`}>
              {PRACTICAL_RESULT_VALUES.map((value) => {
                const isSelected = selected === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${value} of ${PRACTICAL_RESULT_MAX}`}
                    disabled={pending}
                    onClick={() => setSelected(value)}
                    className={`inline-flex size-11 items-center justify-center rounded-md border text-base font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? ACTIVE_CLASS[ratingBand(value)]
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Remarks <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any notes for this learner…"
              rows={3}
              maxLength={500}
              disabled={pending}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] resize-none disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d050d] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? "Saving…" : "Save Result"}
          </button>
        </div>
    </ModalShell>,
    document.body
  );
}
