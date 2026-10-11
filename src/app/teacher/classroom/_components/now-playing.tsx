import type { ActiveSession } from "@/types/learner";
import type { LiveStatus } from "./live-status";

const startedFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });

/** The class's current activity and how far the present learners have got with it; sits in the controls card. */
export default function NowPlaying({ session, counts }: { session: ActiveSession | null; counts: Record<LiveStatus, number> }) {
  if (!session) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-stone-800">No class running</p>
        <p className="mt-0.5 text-xs text-stone-500">Take attendance, then press Start Class to pick a lesson and activity.</p>
      </div>
    );
  }

  const present = counts.rate + counts.playing + counts.not_started + counts.finished;
  // A learner waiting for a rating has already finished the activity itself.
  const done = counts.finished + counts.rate;
  const percent = present ? Math.round((done / present) * 100) : 0;
  const format = session.activeActivityFormat;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
            Now playing
          </p>
          <h2 className="mt-1 truncate text-lg font-bold text-stone-900">{session.activeActivityName ?? "No activity picked yet"}</h2>
          <p className="truncate text-xs text-stone-500">
            {[session.activeModule?.moduleName, session.activeLessonTitle].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-stone-500">
          {format && (
            <span className="rounded-full bg-sidebar/10 px-2 py-0.5 font-semibold text-sidebar">
              {format === "practical" ? "Practical" : "Digital"}
            </span>
          )}
          <span>Started {startedFormat.format(session.startedAt)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Present learners who finished the activity"
          aria-valuemin={0}
          aria-valuemax={present}
          aria-valuenow={done}
          className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"
        >
          <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
        <p className="shrink-0 text-xs font-semibold tabular-nums text-stone-700">
          {done} of {present} finished
          {counts.rate > 0 && <span className="text-amber-700"> · {counts.rate} waiting for your rating</span>}
        </p>
      </div>
    </div>
  );
}
