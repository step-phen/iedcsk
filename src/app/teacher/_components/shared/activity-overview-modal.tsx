"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ActivityInfo } from "@/types/learner";
import type { ScoreBand } from "@/constants/enums";
import { ModalShell } from "@/components/ui/modal-shell";
import { ratingBand, ratingLabel } from "@/lib/score-band";

const PRACTICAL_RESULT_BADGE: Record<ScoreBand, string> = {
  needs_help: "bg-rose-100 text-rose-700 border-rose-200",
  good: "bg-amber-100 text-amber-700 border-amber-200",
  very_good: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface ActivityOverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  learnerName: string;
  /** "Missed" or "Done" — which list this modal is showing. */
  kind: "Missed" | "Done";
  activities: ActivityInfo[];
}

/**
 * Full-list view for a learner card's "+N more" pill — the card itself only
 * shows the first 3 of each bucket, this shows every one.
 */
export default function ActivityOverviewModal({
  open,
  onOpenChange,
  learnerName,
  kind,
  activities,
}: ActivityOverviewModalProps) {
  // createPortal needs document.body, unavailable during SSR. Portaled
  // rather than rendered in place: the card this opens from has both
  // overflow-hidden and a hover:translate transform, and a transform on any
  // ancestor makes it the containing block for position:fixed descendants —
  // paired with overflow-hidden, that clips the modal into the card's box
  // for as long as the card stays hovered (i.e. right after the click that
  // opened it).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-mount flag for SSR-safe portal, must run post-mount
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <ModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      title={`${kind === "Missed" ? "Missed" : "Completed"} Activities`}
      subtitle={learnerName}
      headerId="activity-overview-title"
      maxWidth="max-w-md"
      panelClassName="max-h-[80vh] flex flex-col"
    >
      <div className="px-6 py-4 overflow-y-auto space-y-1.5">
        {activities.map((act, i) => (
          <div
            key={i}
            className="text-xs text-gray-700 border-b border-gray-100 pb-1.5 last:border-b-0 last:pb-0"
          >
            {act.week !== undefined && (
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 mr-1.5 align-middle">
                Week {act.week}
              </span>
            )}
            <span className="font-semibold text-gray-900">{act.moduleName}</span>
            <span className="text-gray-400"> · </span>
            <span className="font-semibold text-gray-800">{act.activityName}</span>
            {act.score !== undefined && act.activityScore !== undefined && (
              <span className="font-semibold ml-1">= {act.score}/{act.activityScore}</span>
            )}
            {act.practicalResult && (
              <span
                className={`inline-block ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PRACTICAL_RESULT_BADGE[ratingBand(act.practicalResult)]}`}
              >
                {ratingLabel(act.practicalResult)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3 shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Close
        </button>
      </div>
    </ModalShell>,
    document.body
  );
}
