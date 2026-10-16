"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import HeaderClock from "@/app/teacher/_components/layout/header-clock";
import FinishBell from "@/app/teacher/_components/layout/finish-bell";
import SectionSelector from "@/app/teacher/_components/dashboard/section-selector";
import ClassStatusPill from "./class-status-pill";
import AttendanceModal from "./attendance-modal";
import ClassroomLearnerCard from "./classroom-learner-card";
import { PageLoader } from "@/components/ui/page-loader";
import BackLink from "@/app/teacher/learners/[profileId]/_components/back-link";
import ClassControls, { type Module } from "./class-controls";
import NowPlaying from "./now-playing";
import Segmented from "@/app/teacher/_components/shared/segmented";
import { LIVE_STATUS_LABEL, LIVE_STATUS_ORDER, liveStatus, type LiveStatus } from "./live-status";
import { apiFetch } from "@/lib/api";
import type { ActiveSession, LearnerListItem } from "@/types/learner";
import type { Section } from "@/types/db";

/** EXCUSED comes back once an excuse slip turns today's Absent into an excused day. */
type AttendanceMark = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

/** GET /api/sections/{id}/classroom, everything this page shows. */
interface ClassroomData {
  activeSession: (Omit<ActiveSession, "startedAt"> & { startedAt: string }) | null;
  modules: Module[];
  /** Today's attendance marks keyed by learner id; unmarked learners are absent from it. */
  attendance: Record<number, AttendanceMark>;
  /** Learner ids who started an activity today in this section; the API refuses Absent for them. */
  startedToday: number[];
  learners: LearnerListItem[];
}

interface ClassroomClientProps {
  today: string;
  sections: Section[];
  sectionId: number | null;
  /** Arrived from the dashboard's attendance card (?attendance=1), so the attendance modal should already be open. */
  openAttendance?: boolean;
}

export default function ClassroomClient({ today, sections, sectionId, openAttendance = false }: ClassroomClientProps) {
  const router = useRouter();
  const [attendanceOpen, setAttendanceOpen] = useState(openAttendance);
  // Tagged with its section so a slow response never shows under another one; null data means loading failed.
  const [loaded, setLoaded] = useState<{ sectionId: number; data: ClassroomData | null }>();
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<"all" | LiveStatus>("all");
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // The param has done its job above, so drop it from the URL; a refresh would otherwise reopen the modal.
  useEffect(() => {
    if (openAttendance) {
      router.replace(sectionId ? `/teacher/classroom?section=${sectionId}` : "/teacher/classroom", { scroll: false });
    }
  }, [openAttendance, sectionId, router]);

  useEffect(() => {
    if (sectionId === null) return;
    const controller = new AbortController();
    apiFetch(`/api/sections/${sectionId}/classroom`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GET classroom failed: ${res.status}`);
        return res.json();
      })
      .then((data: ClassroomData) => setLoaded({ sectionId, data }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("[classroom]", error);
        // A failed background refresh keeps what is on screen; only a first load shows the error.
        setLoaded((prev) => (prev?.sectionId === sectionId && prev.data ? prev : { sectionId, data: null }));
      });
    return () => controller.abort();
  }, [sectionId, reloadKey]);

  const data = loaded?.sectionId === sectionId ? loaded.data : undefined;
  const activeSession: ActiveSession | null = data?.activeSession
    ? { ...data.activeSession, startedAt: new Date(data.activeSession.startedAt) }
    : null;

  // Each learner's place on the current activity, sorted so whoever needs the teacher comes first.
  const roster = (data?.learners ?? [])
    .map((learner) => ({ learner, status: liveStatus(learner, data?.attendance[learner.learnerId]) }))
    .sort((a, b) => LIVE_STATUS_ORDER.indexOf(a.status) - LIVE_STATUS_ORDER.indexOf(b.status));
  const counts = Object.fromEntries(LIVE_STATUS_ORDER.map((s) => [s, roster.filter((r) => r.status === s).length])) as Record<LiveStatus, number>;
  const shown = filter === "all" ? roster : roster.filter((r) => r.status === filter);

  // Learners play on their own devices, so poll while a class runs to move the roster cards along.
  const classRunning = !!data?.activeSession;
  useEffect(() => {
    if (!classRunning) return;
    const interval = setInterval(reload, 5000);
    return () => clearInterval(interval);
  }, [classRunning, reload]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="z-30 w-full shrink-0 bg-[#eae4c9]">
        <header className="relative flex min-h-14 items-center gap-3 border-b border-gray-200/80 bg-white px-4 py-2.5 shadow-sm sm:px-6">
          <BackLink href="/teacher" label="Back to Dashboard" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* While a class runs, the Now Playing panel below says what the pill would. */}
            {!activeSession && <ClassStatusPill activeSession={null} dayEnded={false} />}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <HeaderClock initialDate={today} />
            <div className="h-6 w-px shrink-0 bg-gray-200" />
            <FinishBell />
          </div>
        </header>
      </div>

      {/* The viewport-height shell reserves space for the header and footer; only the roster area scrolls. */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* One card holds the class controls and, under them, what is playing now. */}
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
              {/* The filter sits beside the section, so both "which learners" choices read together. */}
              <div className="flex flex-wrap items-center gap-3">
                <SectionSelector sections={sections} selectedSectionId={sectionId} />
                {roster.length > 0 && (
                  <Segmented
                    label="Show learners"
                    hideLabel
                    options={[
                      { value: "all", label: `All ${roster.length}` },
                      ...LIVE_STATUS_ORDER.map((s) => ({ value: s, label: `${s === "rate" ? "To rate" : LIVE_STATUS_LABEL[s]} ${counts[s]}` })),
                    ]}
                    value={filter}
                    onChange={(v) => setFilter(v as typeof filter)}
                  />
                )}
              </div>
              {sectionId !== null && data && (
                <div className="flex items-center gap-3">
                  {/* Attendance comes first, since a class starts with it; End Class sits last. */}
                  <button
                    type="button"
                    onClick={() => setAttendanceOpen(true)}
                    className="h-9.5 justify-center px-3 rounded-lg font-semibold text-sm text-[#5b0610] bg-white border border-[#5b0610]/30 hover:bg-[#5b0610]/5 transition-colors duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
                  >
                    <ClipboardCheck size={14} />
                    Attendance
                  </button>
                  <ClassControls
                    sectionId={sectionId}
                    modules={data.modules}
                    dayEnded={false}
                    attendanceTaken={data.learners.length > 0 && data.learners.every((l) => data.attendance[l.learnerId])}
                    activeSession={activeSession}
                    onChanged={reload}
                  />
                </div>
              )}
            </div>
            {sectionId !== null && data && <NowPlaying session={activeSession} counts={counts} />}
          </section>

          {sectionId === null ? (
            <p className="pt-6 text-center text-sm text-gray-600">No sections yet. Add one in Settings › Sections.</p>
          ) : data === undefined ? (
            <PageLoader />
          ) : data === null ? (
            <p className="pt-6 text-center text-sm text-red-600">Could not load the classroom. Please refresh the page.</p>
          ) : (
            <div className="pt-5">
              <LearnerGrid roster={shown} empty={roster.length === 0} attendance={data.attendance} session={activeSession} sectionId={sectionId} onRated={reload} />
            </div>
          )}
        </div>
      </div>

      {sectionId !== null && data && (
        <AttendanceModal
          open={attendanceOpen}
          onOpenChange={setAttendanceOpen}
          sectionId={sectionId}
          learners={data.learners}
          // Excused days are settled by the slip, so they reach the modal apart from the marks it can change.
          initialAttendance={
            Object.fromEntries(Object.entries(data.attendance).filter(([, mark]) => mark !== "EXCUSED")) as Record<number, Exclude<AttendanceMark, "EXCUSED">>
          }
          excused={new Set(Object.keys(data.attendance).map(Number).filter((id) => data.attendance[id] === "EXCUSED"))}
          startedToday={new Set(data.startedToday)}
          classEndedToday={false}
          onSaved={reload}
          onRefresh={reload}
        />
      )}
    </div>
  );
}

function LearnerGrid({
  roster,
  empty,
  attendance,
  session,
  sectionId,
  onRated,
}: {
  roster: { learner: LearnerListItem; status: LiveStatus }[];
  empty: boolean;
  attendance: Record<number, AttendanceMark>;
  session: ActiveSession | null;
  sectionId: number;
  onRated: () => void;
}) {
  if (empty) {
    return <p className="pt-2 text-center text-sm text-gray-600">No learners yet. Add a learner on the Learners page.</p>;
  }
  if (roster.length === 0) {
    return <p className="pt-2 text-center text-sm text-gray-600">No learners here right now.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {roster.map(({ learner, status }) => (
        <ClassroomLearnerCard
          key={learner.learnerId}
          learner={learner}
          status={status}
          excused={attendance[learner.learnerId] === "EXCUSED"}
          session={session}
          sectionId={sectionId}
          onRated={onRated}
        />
      ))}
    </div>
  );
}
