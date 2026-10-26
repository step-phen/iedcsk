"use client";

import { useState, useTransition } from "react";
import { apiFetch } from "@/lib/api";
import { useActiveSchoolYear } from "@/hooks/useActiveSchoolYear";
import { Play, Square, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import MarqueeText from "@/components/ui/marquee-text";
import { ModalShell } from "@/components/ui/modal-shell";
import StartClassButton from "./start-class-button";
import type { ActiveSession } from "@/types/learner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Module/lesson/activity names come from teacher-authored curriculum data and
// can run long. ItemText is shrink-0/whitespace-nowrap by default, so the
// popup would otherwise clip long names outright (overflow-x-hidden, no
// ellipsis). w-0 + flex-1 forces ItemText to the item's own width instead —
// the classic flex trick, and unlike overriding shrink-0 it does not depend
// on utility order. That width is what MarqueeText measures against.
const SELECT_ITEM_CLASS =
  "py-2.5 text-base overflow-hidden [&>div:first-child]:w-0 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1 [&>div:first-child]:overflow-hidden";

interface Activity {
  id: number;
  activityName: string;
  day: string;
}

interface Lesson {
  id: number;
  lessonName: string;
  /** Developmental domain the lesson belongs to; MAPEH has three. */
  domainName: string;
  week: number;
  activities: Activity[];
}

export interface Module {
  id: number;
  moduleName: string;
  scheduleDays: { day: string }[];
  lessons: Lesson[];
}

interface ClassControlsProps {
  sectionId: number;
  modules: Module[];
  /** Today's class was ended and may not restart; the server currently always allows a restart. */
  dayEnded: boolean;
  /** Every learner has a saved mark today; a class cannot start before that. */
  attendanceTaken: boolean;
  activeSession: ActiveSession | null;
  /** Reloads the classroom after a start, change or end. */
  onChanged: () => void;
}

/** The API's 422 message, or a fallback for anything else. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status !== 422) return fallback;
  const { errors } = (await res.json()) as { errors: Record<string, string[]> };
  return Object.values(errors)[0]?.[0] ?? fallback;
}

async function postClass(sectionId: number, action: "start" | "end", body?: object): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await apiFetch(`/api/sections/${sectionId}/classroom/${action}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return { success: true };
    return { success: false, error: await errorMessage(res, `Failed to ${action} class.`) };
  } catch {
    return { success: false, error: "Could not reach the server. Please try again." };
  }
}

export default function ClassControls({
  sectionId,
  modules,
  dayEnded,
  attendanceTaken,
  activeSession,
  onChanged,
}: ClassControlsProps) {
  const [isPending, startTransition] = useTransition();
  // Classes only run in the active quarter; with none active, nothing can start (the API enforces it too).
  const schoolYear = useActiveSchoolYear();
  const noActiveQuarter = schoolYear !== undefined && (schoolYear?.activeQuarterNumber ?? null) === null;
  const [showModal, setShowModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");

  const resetSelections = () => {
    setSelectedModuleId("");
    setSelectedDomain("");
    setSelectedLessonId("");
    setSelectedActivityId("");
  };

  // Derive selected module's lessons and activities (no quarter/week/day filtering — all shown)
  const selectedModule = modules.find((m) => m.id === Number(selectedModuleId));
  const moduleLessons = selectedModule?.lessons ?? [];
  // A module spanning several domains (MAPEH) asks for the domain first, then lists only its lessons.
  const availableDomains = [...new Set(moduleLessons.map((l) => l.domainName))];
  const needsDomain = availableDomains.length > 1;
  const domainLessons = needsDomain ? moduleLessons.filter((l) => l.domainName === selectedDomain) : moduleLessons;
  // MAPEH saves one lesson row per class day under the same title (Tuesday's activity, Thursday's activity),
  // so same-week rows sharing a title show as one lesson; each activity keeps its own lessonId for the start call.
  const availableLessons = domainLessons.reduce<(Omit<Lesson, "activities"> & { activities: (Activity & { lessonId: number })[] })[]>(
    (topics, l) => {
      const activities = l.activities.map((a) => ({ ...a, lessonId: l.id }));
      const same = topics.find((t) => t.week === l.week && t.lessonName === l.lessonName);
      if (same) same.activities.push(...activities);
      else topics.push({ ...l, activities });
      return topics;
    },
    []
  );
  const selectedLesson = availableLessons.find((l) => l.id === Number(selectedLessonId));
  const availableActivities = selectedLesson?.activities ?? [];
  const selectedActivity = availableActivities.find((a) => a.id === Number(selectedActivityId));

  const handleStartClass = async () => {
    const moduleId = selectedModuleId ? parseInt(selectedModuleId, 10) : null;
    const lessonId = selectedActivity?.lessonId ?? null;
    const activityId = selectedActivityId ? parseInt(selectedActivityId, 10) : null;
    const wasAlreadyActive = !!activeSession;
    startTransition(async () => {
      const res = await postClass(sectionId, "start", { moduleId, lessonId, activityId });
      if (res.success) {
        setShowModal(false);
        resetSelections();
        onChanged();
        toast.success(
          wasAlreadyActive
            ? "Changed to the new lesson/activity!"
            : "Classroom session started successfully!"
        );
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleEndClass = () => {
    startTransition(async () => {
      const res = await postClass(sectionId, "end");
      if (res.success) {
        setShowEndModal(false);
        onChanged();
        toast.success("Classroom session ended.");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {activeSession ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            disabled={isPending}
            className="h-9.5 justify-center px-3 rounded-lg font-semibold text-sm text-white bg-[#5b0610] hover:bg-[#4d050d] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Change Lesson
          </button>
          <button
            onClick={() => setShowEndModal(true)}
            disabled={isPending}
            className="h-9.5 justify-center px-3 rounded-lg font-semibold text-sm text-[#5b0610] bg-white hover:bg-gray-50 border border-[#5b0610] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
            End Class
          </button>
        </div>
      ) : (
        <StartClassButton
          onClick={() => setShowModal(true)}
          disabled={isPending || dayEnded || !attendanceTaken || noActiveQuarter}
          isPending={isPending}
          dayEnded={dayEnded}
          reason={
            dayEnded
              ? "Only one class session per day. Start a new class tomorrow."
              : noActiveQuarter
                ? "No quarter is active. Activate a quarter to start classes."
                : undefined
          }
        />
      )}

      {/* Start Class modal */}
      <ModalShell
        open={showModal}
        onClose={() => { setShowModal(false); resetSelections(); }}
        title={activeSession ? "Change Lesson" : "Start a New Class Session"}
        subtitle={
          activeSession
            ? "Pick the next lesson. Learners stay connected."
            : "Choose what learners will do."
        }
        headerId="start-class-modal-title"
        maxWidth="max-w-md"
        panelClassName="max-h-[85vh] max-h-[85dvh] flex flex-col"
      >
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Select Module</label>
              <Select
                value={selectedModuleId}
                onValueChange={(value) => {
                  setSelectedModuleId(value ?? "");
                  setSelectedDomain("");
                  setSelectedLessonId("");
                  setSelectedActivityId("");
                }}
              >
                <SelectTrigger className="w-full h-18 text-lg">
                  <SelectValue placeholder="Select a module">
                    {selectedModule?.moduleName || "Select a module"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modules</SelectLabel>
                    {modules.length === 0 && (
                      <div className="px-2 py-2 text-sm text-gray-500">
                        No modules available.
                      </div>
                    )}
                    {modules.map((mod) => (
                      <SelectItem key={mod.id} value={String(mod.id)} className={SELECT_ITEM_CLASS}>
                        <MarqueeText>{mod.moduleName}</MarqueeText>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {selectedModuleId && needsDomain && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Select Area</label>
                <Select
                  value={selectedDomain}
                  onValueChange={(value) => {
                    setSelectedDomain(value ?? "");
                    setSelectedLessonId("");
                    setSelectedActivityId("");
                  }}
                >
                  <SelectTrigger className="w-full h-18 text-lg">
                    <SelectValue placeholder="Select an area">
                      {selectedDomain || "Select an area"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Areas</SelectLabel>
                      {availableDomains.map((domain) => (
                        <SelectItem key={domain} value={domain} className={SELECT_ITEM_CLASS}>
                          <MarqueeText>{domain}</MarqueeText>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedModuleId && availableLessons.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Select Lesson</label>
                <Select
                  value={selectedLessonId}
                  onValueChange={(value) => {
                    setSelectedLessonId(value ?? "");
                    setSelectedActivityId("");
                  }}
                >
                  <SelectTrigger className="w-full h-18 text-lg">
                    <SelectValue placeholder="Select a lesson">
                      {selectedLesson ? selectedLesson.lessonName : "Select a lesson"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Lessons</SelectLabel>
                      {availableLessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={String(lesson.id)} className={SELECT_ITEM_CLASS}>
                          <MarqueeText>
                            {lesson.lessonName}
                          </MarqueeText>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedLessonId && availableActivities.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Select Activity</label>
                <Select
                  value={selectedActivityId}
                  onValueChange={(value) => setSelectedActivityId(value ?? "")}
                >
                  <SelectTrigger className="w-full h-18 text-lg">
                    <SelectValue placeholder="Select an activity">
                      {selectedActivity ? selectedActivity.activityName : "Select an activity"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Activities</SelectLabel>
                      {availableActivities.map((activity) => (
                        <SelectItem key={activity.id} value={String(activity.id)} className={SELECT_ITEM_CLASS}>
                          <MarqueeText>{activity.activityName}</MarqueeText>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {modules.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-md border border-amber-100">
                No modules yet — you can start without one, or add one on the Modules page.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-row justify-center gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => setShowConfirmStart(true)}
              disabled={isPending || !selectedModuleId || !selectedLessonId || !selectedActivityId}
              className="px-5 py-2 text-sm font-bold text-white bg-[#5b0610] hover:bg-[#4d050d] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
            >
              {activeSession ? "Confirm Change" : "Confirm Start"}
            </button>
            <button
              onClick={() => { setShowModal(false); resetSelections(); }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
          </div>
      </ModalShell>

      {/* End Class AlertDialog */}
      <AlertDialog open={showEndModal} onOpenChange={setShowEndModal}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>End Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This ends today&apos;s class and disconnects all learners.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndClass}
              disabled={isPending}
              className="bg-[#5b0610] hover:bg-[#4d050d] text-white"
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              Yes, End Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Start AlertDialog */}
      <AlertDialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeSession ? "Change Lesson?" : "Start Class?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeSession
                ? "This updates the current lesson. Learners stay connected."
                : "This starts a new class and notifies all learners."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            {selectedModule && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Module:</span> {selectedModule.moduleName}
              </div>
            )}
            {needsDomain && selectedDomain && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Area:</span> {selectedDomain}
              </div>
            )}
            {selectedActivity && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Activity:</span> {selectedActivity.activityName}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmStart(false);
                handleStartClass();
              }}
              disabled={isPending}
              className="bg-[#5b0610] hover:bg-[#4d050d] text-white"
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {activeSession ? "Yes, Change" : "Yes, Start Class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
