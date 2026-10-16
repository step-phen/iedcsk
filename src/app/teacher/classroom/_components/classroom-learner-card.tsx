"use client";

import Image from "next/image";
import { useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";
import type { ActiveSession, LearnerListItem } from "@/types/learner";
import { PRACTICAL_RESULT_LABEL } from "@/constants/enums";
import { displayName, getInitials, getAvatarColor } from "@/lib/learners";
import { RESULT_CLASS, percentOf, scoreBand } from "@/lib/score-band";
import { cn } from "@/lib/utils";
import PracticalScoreModal from "@/app/teacher/_components/shared/practical-score-modal";
import ActivityOverviewModal from "@/app/teacher/_components/shared/activity-overview-modal";
import ExcuseSlipModal from "@/app/teacher/learners/[profileId]/_components/excuse-slip-modal";
import { formatDatePH, todayDatePH } from "@/lib/datetime";
import { LIVE_STATUS_LABEL, type LiveStatus } from "./live-status";

const STATUS_CHIP: Record<LiveStatus, string> = {
  rate: "bg-amber-100 text-amber-800 border-amber-300",
  playing: "bg-sky-100 text-sky-800 border-sky-200",
  not_started: "bg-stone-100 text-stone-600 border-stone-200",
  finished: "bg-emerald-100 text-emerald-800 border-emerald-200",
  absent: "bg-stone-100 text-stone-500 border-stone-200",
};

const AVATAR_RING: Record<LiveStatus, string> = {
  rate: "ring-2 ring-amber-400 ring-offset-2",
  playing: "ring-2 ring-sky-400 ring-offset-2",
  not_started: "",
  finished: "ring-2 ring-emerald-400 ring-offset-2",
  absent: "",
};

const PILL = "inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums";

/**
 * The roster card for a running class: one status for the current activity, its result, and the one action
 * the teacher may need. No Profile link here: the teacher is running a class, not browsing records.
 */
export default function ClassroomLearnerCard({
  learner,
  status,
  excused,
  session,
  sectionId,
  onRated,
}: {
  learner: LearnerListItem;
  status: LiveStatus;
  /** Absent today, with an excuse slip already logged. */
  excused: boolean;
  session: ActiveSession | null;
  sectionId: number;
  /** Reloads the classroom after a rating or an excuse slip. */
  onRated: () => void;
}) {
  const { missingActivities, completedActivities, activePracticalActivity } = learner;
  const fullName = displayName(learner);
  // Today's entry for the activity on screen, matched the way the overview lists it.
  const current = session
    ? completedActivities.find((a) => a.activityName === session.activeActivityName && a.moduleName === session.activeModule?.moduleName)
    : undefined;

  const [scoreOpen, setScoreOpen] = useState(false);
  // Bumped on each open so the slip form starts empty.
  const [slipKey, setSlipKey] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  // The kind outlives the open flag, so the title doesn't flip while the modal closes.
  const [overviewKind, setOverviewKind] = useState<"Done" | "Missed">("Done");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const openOverview = (kind: "Done" | "Missed") => {
    setOverviewKind(kind);
    setOverviewOpen(true);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className={cn("h-1 w-full bg-sidebar", status === "absent" && "opacity-60")} />

      <div className="space-y-3 p-4">
        {/* Photo on the left; name and the status chips stack beside it. Dimmed when away, but the slip button stays crisp. */}
        <div className={cn("flex items-center gap-3", status === "absent" && "opacity-60")}>
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold",
              getAvatarColor(learner.learnerId),
              AVATAR_RING[status],
            )}
          >
            {learner.photoUrl ? (
              <Image src={learner.photoUrl} alt="" width={56} height={56} className="size-full object-cover" />
            ) : (
              getInitials(learner.firstName, learner.lastName)
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-sm font-semibold text-gray-900">{fullName}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", STATUS_CHIP[status])}>
                {status === "playing" && <span aria-hidden="true" className="size-1.5 rounded-full bg-sky-500 motion-safe:animate-pulse" />}
                {excused ? "Excused" : LIVE_STATUS_LABEL[status]}
              </span>
              {/* The result on the current activity: a colored score, or the practical rating once given. */}
              {current?.score !== undefined && current.activityScore !== undefined && (
                <span
                  title={`${current.score} of ${current.activityScore}`}
                  className={cn(PILL, RESULT_CLASS[scoreBand(percentOf(current.score, current.activityScore))])}
                >
                  {current.score}/{current.activityScore}
                </span>
              )}
              {current?.practicalResult && (
                <span className={cn(PILL, RESULT_CLASS[current.practicalResult])}>{PRACTICAL_RESULT_LABEL[current.practicalResult]}</span>
              )}
            </div>
          </div>
        </div>

        {status === "rate" && (
          <button
            type="button"
            onClick={() => setScoreOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-sidebar py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
          >
            <ClipboardCheck size={15} aria-hidden="true" />
            Rate now
          </button>
        )}

        {status === "absent" && !excused && (
          <button
            type="button"
            onClick={() => {
              setSlipKey((k) => k + 1);
              setSlipOpen(true);
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
          >
            <FileText size={15} aria-hidden="true" />
            Log Excuse Slip
          </button>
        )}

        {(completedActivities.length > 0 || missingActivities.length > 0) && (
          <p className="flex flex-wrap items-center gap-x-2 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
            Today&apos;s activities:
            {completedActivities.length > 0 && (
              <button type="button" onClick={() => openOverview("Done")} className="cursor-pointer font-semibold text-emerald-700 hover:underline">
                {completedActivities.length} done
              </button>
            )}
            {missingActivities.length > 0 && (
              <button type="button" onClick={() => openOverview("Missed")} className="cursor-pointer font-semibold text-amber-700 hover:underline">
                {missingActivities.length} missed
              </button>
            )}
          </p>
        )}
      </div>

      {status === "rate" && activePracticalActivity && (
        <PracticalScoreModal
          // Remount on activity switch, so the previous demonstration's picks never linger.
          key={activePracticalActivity.activityId}
          open={scoreOpen}
          onOpenChange={setScoreOpen}
          learnerId={learner.learnerId}
          learnerName={fullName}
          activityId={activePracticalActivity.activityId}
          activityName={activePracticalActivity.activityName ?? "Practical Activity"}
          initialStatus={activePracticalActivity.ratingStatus}
          sectionId={sectionId}
          onSaved={onRated}
          initialRemarks={activePracticalActivity.remarks}
        />
      )}

      {status === "absent" && !excused && (
        <ExcuseSlipModal
          key={slipKey}
          open={slipOpen}
          onClose={() => setSlipOpen(false)}
          learnerId={learner.learnerId}
          learnerName={fullName}
          // The classroom only ever excuses today's absence; older ones are on the learner's profile.
          absentDays={[
            {
              isoDate: todayDatePH().toISOString().slice(0, 10),
              label: formatDatePH(new Date(), { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
            },
          ]}
          onSaved={onRated}
        />
      )}

      <ActivityOverviewModal
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
        learnerName={fullName}
        kind={overviewKind}
        activities={overviewKind === "Missed" ? missingActivities : completedActivities}
      />
    </div>
  );
}
