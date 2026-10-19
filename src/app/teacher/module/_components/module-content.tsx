"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Clock,
  Lock,
  LockOpen,
  Plus,
  Pencil,
  Video,
} from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { PageLoader } from "@/components/ui/page-loader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MODULE_LOCKED_HINT,
  moduleSlug,
  quarterSlug,
  QUARTER_COMPLETED_HINT,
  QUARTER_LOCKED_HINT,
  QUARTER_NOT_SET_HINT,
} from "@/lib/utils";
import { reloadActiveSchoolYear, useActiveSchoolYear, useActiveSchoolYearFailed } from "@/hooks/useActiveSchoolYear";
import { apiFetch } from "@/lib/api";
import { useSections } from "@/hooks/useSections";
import { useShell } from "@/app/teacher/_components/layout/shell-context";
import { SELECT_CLASS, STORAGE_KEY as SECTION_STORAGE_KEY } from "@/app/teacher/_components/dashboard/section-selector";
import WeekLessonsModal from "./week-lessons-modal";
import AddLessonForm, { lessonDay, type CreatedLesson } from "./add-lesson-form";
import AddModuleForm, { type CreatedModule } from "./add-module-form";
import UpdateLessonsModal from "./update-lessons-modal";

type Lesson = {
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
  /** Used in a class or by a learner (API rule): viewable, never changed again. */
  hasRecords: boolean;
  /** The selected section's progress on this lesson's card (computed by the API); null without a section. */
  completion?: LessonCompletion | null;
};
type LessonCompletion = { status: "done" | "in_progress" | null; completed: number; total: number };
type Module = {
  id: number;
  moduleName: string;
  scheduleDays: { day: string; startTime: string; endTime: string }[];
  domains: { id: number; name: string }[];
  lessons: Lesson[];
};
type Quarter = {
  quarterId: number;
  quarterNumber: number;
  quarterName: string;
  schoolYear: string;
};

const titleCase = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();

/** The class days a module meets on, e.g. ["Monday", "Wednesday", "Friday"]. */
function classDays(scheduleDays: { day: string }[]) {
  return scheduleDays.map((sd) => titleCase(sd.day));
}

function formatSchedule(
  scheduleDays: { day: string; startTime: string; endTime: string }[],
) {
  if (!scheduleDays || scheduleDays.length === 0) return "—";
  const days = classDays(scheduleDays).join(" / ");
  // Every day a module runs shares one time slot (confirmed against
  // class_schedule), so the first row's time represents the whole schedule.
  const { startTime, endTime } = scheduleDays[0];
  return `${days} • ${startTime} – ${endTime}`;
}

/** The Dashboard/Modules shared section choice, or null when storage is unavailable. */
function readStoredSectionId(): string | null {
  try {
    return localStorage.getItem(SECTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Curriculum order for the sidebar. Matched by the module name's leading
 * keyword so exact DB wording does not have to be repeated here. */
const MODULE_ORDER = ["reading", "language", "writing", "mapeh", "math"];

function moduleRank(name: string) {
  const normalized = name.trim().toLowerCase();
  const index = MODULE_ORDER.findIndex((key) => normalized.startsWith(key));
  // Unknown modules sort after the known ones, keeping their original order.
  return index === -1 ? MODULE_ORDER.length : index;
}

function sortModules(modules: Module[]) {
  return [...modules].sort((a, b) => moduleRank(a.moduleName) - moduleRank(b.moduleName));
}

function groupByWeek(lessons: Lesson[]) {
  const byWeek = lessons.reduce<Record<number, Lesson[]>>((acc, l) => {
    (acc[l.week] ||= []).push(l);
    return acc;
  }, {});
  return { byWeek };
}

type DayEntry = Lesson & { day?: string };
type LessonTopic = { lessonName: string; entries: DayEntry[] };

/** Same-named lessons in a week (one row per class day) read as one topic card with a sub-row per day. */
function groupByTopic(weekLessons: Lesson[], days: string[]): LessonTopic[] {
  const withDay: DayEntry[] = weekLessons.map((l, i) => ({ ...l, day: lessonDay(l.dayOfWeek, days[i]) }));
  const topics: LessonTopic[] = [];
  const byKey = new Map<string, LessonTopic>();
  for (const entry of withDay) {
    const key = entry.lessonName.trim().toLowerCase();
    let topic = byKey.get(key);
    if (!topic) {
      topic = { lessonName: entry.lessonName, entries: [] };
      byKey.set(key, topic);
      topics.push(topic);
    }
    topic.entries.push(entry);
  }
  return topics;
}

/** Done: the teacher finished teaching every activity of the card. The count is learners who finished all of them. */
function CompletionBadge({ completion }: { completion: LessonCompletion }) {
  const done = completion.status === "done";
  return (
    <span
      title={
        done
          ? "You finished teaching this lesson and all its activities. The count shows how many learners finished every activity."
          : "You've started this lesson, but not every activity has been taught yet."
      }
      className="shrink-0 inline-flex items-center gap-1.5"
    >
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
          done ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"
        }`}
      >
        {done && <Check size={12} aria-hidden="true" />}
        {done ? "Done" : "In Progress"}
      </span>
      <span className="text-[11px] text-stone-500 tabular-nums">
        {completion.completed}/{completion.total} learners completed
      </span>
    </span>
  );
}

function LessonGroups({
  lessons,
  days,
  time,
  domains,
  selectedDomainId,
  onDomainChange,
  onOpen,
  onUpdate,
  quarterLock,
  firstVideoOnly,
}: {
  lessons: Lesson[];
  days: string[];
  time: string;
  domains: { id: number; name: string }[];
  selectedDomainId: string;
  onDomainChange: (id: string) => void;
  onOpen: (week: number, lessonIds?: number[], adding?: boolean) => void;
  onUpdate: (week: number) => void;
  /** Why the quarter is view-only (active or completed); null while it's being prepared. */
  quarterLock: string | null;
  /** The active quarter: view-only, but lessons without a video can still get one through Update Lessons. */
  firstVideoOnly: boolean;
}) {
  const readOnly = !!quarterLock;
  const [page, setPage] = useState(0);
  const { byWeek } = groupByWeek(lessons);

  if (lessons.length === 0) {
    return (
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-stone-200/90 shadow-sm flex flex-col items-center justify-center text-center p-6">
        <ClipboardList size={28} className="text-stone-400 mb-3" />
        <p className="text-sm text-stone-600 italic">
          No lessons for this quarter yet.
          <br />
          {quarterLock ?? "Use Add Lesson to create one."}
        </p>
      </div>
    );
  }

  const weekEntries = Object.entries(byWeek).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  // Clamp rather than reset via effect: a page left over from a longer quarter would otherwise point past the end.
  const currentPage = Math.min(page, weekEntries.length - 1);
  const [weekKey, weekLessons] = weekEntries[currentPage];
  const week = Number(weekKey);
  const activityCount = weekLessons.reduce((sum, l) => sum + l.activityCount, 0);
  const topics = groupByTopic(weekLessons, days);
  const iconButton =
    "p-1.5 text-stone-500 hover:text-sidebar rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40 disabled:text-stone-300 disabled:cursor-not-allowed disabled:hover:bg-transparent";

  return (
    <div className="min-h-0 flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 bg-stone-50/80 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider bg-sidebar text-white px-2.5 py-1 rounded-md shadow-xs">
            Week {week}
          </span>
          <p className="text-xs text-stone-500">
            <strong className="text-stone-800">{topics.length}</strong>{" "}
            {topics.length === 1 ? "Lesson" : "Lessons"} •{" "}
            <strong className="text-stone-800">{activityCount}</strong>{" "}
            {activityCount === 1 ? "Activity" : "Activities"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {domains.length > 1 && (
            <>
              <select
                aria-label="Filter by domain"
                value={selectedDomainId}
                onChange={(e) => onDomainChange(e.target.value)}
                className={SELECT_CLASS}
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {(weekEntries.length > 1 || !readOnly || firstVideoOnly) && <span className="w-px h-5 bg-stone-200 mx-1" />}
            </>
          )}
          {weekEntries.length > 1 && (
            <>
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Previous week"
                className={iconButton}
              >
                <ArrowLeft size={15} />
              </button>
              <span className="text-[11px] font-semibold text-stone-600 px-1 tabular-nums">
                {currentPage + 1} / {weekEntries.length}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= weekEntries.length - 1}
                aria-label="Next week"
                className={iconButton}
              >
                <ArrowRight size={15} />
              </button>
              {(!readOnly || firstVideoOnly) && <span className="w-px h-5 bg-stone-200 mx-1" />}
            </>
          )}
          {/* The active quarter keeps only this button, for adding missing lesson videos; nothing else in it can change. */}
          {firstVideoOnly && (
            <button
              onClick={() => onUpdate(week)}
              aria-label={`Add lesson videos for week ${week}`}
              title="Add lesson videos"
              className={iconButton}
            >
              <Pencil size={15} />
            </button>
          )}
          {/* Hidden while the quarter is view-only: its lessons and activities can't be changed then. */}
          {!readOnly && (
            <>
              <button
                onClick={() => onUpdate(week)}
                aria-label={`Update lessons for week ${week}`}
                title="Update Lessons"
                className={iconButton}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => onOpen(week, weekLessons.map((l) => l.id), true)}
                aria-label={`Add a practical activity to week ${week}`}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-sidebar px-3 py-1.5 text-xs font-semibold text-white shadow-sm outline-none transition-colors hover:bg-[#7e1422] focus-visible:ring-2 focus-visible:ring-sidebar/40"
              >
                <Plus size={14} aria-hidden="true" />
                Practical Activity
              </button>
            </>
          )}
        </div>
      </div>

      {/* One card per topic, with a sub-row per class day it's taught on. */}
      <div className="min-h-0 p-3 flex flex-col gap-3">
        {topics.map((topic) => {
          const topicActivityCount = topic.entries.reduce((sum, e) => sum + e.activityCount, 0);
          // The API gives every row of a card the same value.
          const completion = topic.entries.find((e) => e.completion)?.completion;
          return (
            <article
              key={topic.entries[0].id}
              onClick={() => onOpen(week, topic.entries.map((e) => e.id))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(week, topic.entries.map((entry) => entry.id));
                }
              }}
              className="group border border-stone-200 rounded-xl px-4 py-4 bg-white hover:border-sidebar/30 hover:shadow-md transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
            >
              {/* The full title wraps; the badge and counts move to the next line when it needs the width. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h5 className="min-w-0 break-words text-sm font-bold text-stone-900 group-hover:text-sidebar transition-colors">
                  {topic.lessonName}
                </h5>
                {completion?.status && <CompletionBadge completion={completion} />}
                <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                  <ClipboardList size={13} className="text-stone-400" />
                  {topicActivityCount}{" "}
                  {topicActivityCount === 1 ? "Activity" : "Activities"} Planned
                </span>
              </div>
              {/* One description for the topic, not repeated per day — entries share the same text. */}
              {topic.entries.find((e) => e.description)?.description && (
                <p
                  title={topic.entries.find((e) => e.description)?.description ?? undefined}
                  className="mt-1 text-[11px] text-stone-500 leading-snug line-clamp-1"
                >
                  {topic.entries.find((e) => e.description)?.description}
                </p>
              )}
              <div className="mt-2 flex flex-col gap-1.5">
                {topic.entries.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {entry.day && (
                      <span className="text-[10px] font-bold tracking-wider text-sidebar uppercase bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                        {entry.day}
                      </span>
                    )}
                    {time && <span className="text-[11px] text-stone-400">{time}</span>}
                    {entry.videoUrl && (
                      <span
                        title="Has lesson video"
                        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-sky-700 uppercase bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded"
                      >
                        <Video size={11} />
                        Video
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ModuleContent({ quarters }: { quarters: Quarter[] }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  // Which module/quarter the teacher was last looking at, carried in the URL
  // so it survives the trip into a lesson and back — this state used to live
  // only in memory, so returning from a lesson always reset the board to the
  // first module (Reading) and the first quarter, whichever one you left from.
  const [activeQuarter, setActiveQuarter] = useState(() => {
    const slug = searchParams.get("quarter");
    const fromUrl = slug
      ? quarters.find((q) => quarterSlug(q.quarterName) === slug)
      : undefined;
    return String(fromUrl?.quarterId ?? quarters[0]?.quarterId ?? 1);
  });
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  // Read once, via a ref, so the load effect doesn't depend on searchParams:
  // reading it directly would refetch the module list on every URL update.
  const initialModuleSlug = useRef(searchParams.get("module"));
  const initialDomainSlug = useRef(searchParams.get("domain"));
  // Bumped by the error state's retry button.
  const [reloadKey, setReloadKey] = useState(0);

  const activeModule = modules.find((m) => m.id === selectedModuleId);
  const activeQuarterLabel =
    quarters.find((q) => q.quarterId === Number(activeQuarter))?.quarterName || "";
  const activeQuarterId = Number(activeQuarter);

  // Only the active year's upcoming quarters are being prepared. The active quarter is open for
  // classes and completed ones are over, so both are read-only, and so is a quarter the year hasn't
  // set up (or every quarter when no year is active). Sections only come from the active year, so
  // these are the selected section's quarters. Locked until the year loads (fail closed); the API
  // checks the same rule again on every save.
  const schoolYear = useActiveSchoolYear();
  const classQuarter = schoolYear?.activeQuarterNumber ?? null;
  const quarterStatus = (quarterId: number) => schoolYear?.quarterStatuses?.[quarterId];
  const quarterLock = (quarterId: number) =>
    schoolYear === undefined
      ? "Checking which quarter is active…"
      : quarterId === classQuarter
        ? QUARTER_LOCKED_HINT
        : quarterStatus(quarterId) === "upcoming"
          ? null
          : quarterStatus(quarterId) === "completed"
            ? QUARTER_COMPLETED_HINT
            : QUARTER_NOT_SET_HINT;
  // New modules only before the active year has started; with no active year there's none to protect. Same rule as the API.
  // A failed load stays locked (the year is unknown) but says so and offers a retry, instead of "Checking…" forever.
  const yearFailed = useActiveSchoolYearFailed();
  const moduleLock =
    schoolYear === undefined
      ? yearFailed
        ? "Couldn't check the school year, so modules can't be added right now."
        : "Checking the school year…"
      : schoolYear?.canAddModules === false
        ? MODULE_LOCKED_HINT
        : null;
  // Everything but the brief loading state is explained under the button.
  const moduleHint = moduleLock && (schoolYear !== undefined || yearFailed) ? moduleLock : null;
  // The active quarter is view-only except for one thing: a first video where none exists yet (the API allows the same).
  const firstVideoOnly = (quarterId: number) => schoolYear !== undefined && quarterId === classQuarter;
  const quarterTip = (quarterId: number) =>
    quarterId === classQuarter
      ? "Active quarter: open for classes. Its lessons and practical activities are view-only, but you can still add a video where none exists yet."
      : quarterStatus(quarterId) === "completed"
        ? "Completed: this quarter has ended. Its lessons and practical activities are view-only."
        : quarterStatus(quarterId) === "upcoming"
          ? `Upcoming: ${classQuarter === null ? "no quarter is active, so no class can start. " : ""}You can add and edit this quarter's unused lessons and practical activities.`
          : (quarterLock(quarterId) ?? "");
  const quarterState = (quarterId: number) =>
    quarterId === classQuarter
      ? "(active, view only)"
      : quarterStatus(quarterId) === "completed"
        ? "(completed, view only)"
        : quarterStatus(quarterId) === "upcoming"
          ? "(upcoming, editable)"
          : "(not set up, view only)";
  const [selectedDomainId, setSelectedDomainId] = useState("");
  // Clamp rather than reset via effect: a domain picked on a previous module
  // falls back to the new module's first domain instead of filtering it to nothing.
  const effectiveDomainId = activeModule?.domains.some((d) => String(d.id) === selectedDomainId)
    ? selectedDomainId
    : String(activeModule?.domains[0]?.id ?? "");
  const activeQuarterLessons =
    activeModule?.lessons.filter(
      (l) => l.quarterId === activeQuarterId && l.domainId === Number(effectiveDomainId),
    ) ?? [];

  // The teacher's current class, shared with the Dashboard. Only sections from
  // GET /api/sections (this teacher's, active school year) count, so a stale,
  // old-year or someone else's id in the URL or storage falls through.
  const { sections, loading: sectionsLoading, failed: sectionsFailed } = useSections(true);
  const [pickedSectionId, setPickedSectionId] = useState<string | null>(null);
  const findSection = (id: string | null | undefined) =>
    id ? sections.find((s) => String(s.sectionId) === id) : undefined;
  const urlSectionId = searchParams.get("section");
  const selectedSection =
    findSection(pickedSectionId) ??
    findSection(urlSectionId) ??
    findSection(readStoredSectionId()) ??
    sections[0];
  const selectedSectionId = selectedSection ? String(selectedSection.sectionId) : null;

  // Lessons are shared, but scheduleDays and completion are the selected section's, so the board
  // reloads per section. Every fetch, the normal one and the silent refresh, goes through here:
  // only the newest request's response is applied, so an older one (another section's, or an
  // earlier refresh of the same section) never overwrites newer data. Aborting only saves work.
  const requestSeq = useRef(0);
  // A normal load is in flight: a silent refresh waits rather than superseding it.
  const loadingBoard = useRef(false);
  const loadBoard = useCallback(
    (silent: boolean) => {
      const seq = ++requestSeq.current;
      const controller = new AbortController();
      if (!silent) {
        loadingBoard.current = true;
        setStatus("loading");
      }
      apiFetch(selectedSectionId ? `/api/modules?section=${selectedSectionId}` : "/api/modules", {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          return res.json();
        })
        .then((data: Module[]) => {
          if (seq !== requestSeq.current) return;
          loadingBoard.current = false;
          const ordered = sortModules(data);
          setModules(ordered);
          // Switching sections keeps the module being viewed; the first load uses ?module=.
          let resolvedModuleId: number | null = null;
          setSelectedModuleId((current) => {
            if (ordered.some((m) => m.id === current)) return (resolvedModuleId = current);
            const slug = initialModuleSlug.current;
            const fromUrl = slug ? ordered.find((m) => moduleSlug(m.moduleName) === slug) : undefined;
            return (resolvedModuleId = fromUrl?.id ?? ordered[0]?.id ?? null);
          });
          // Same for the domain, scoped to whichever module that resolved to; the first load uses ?domain=.
          setSelectedDomainId((current) => {
            if (current) return current;
            const domains = ordered.find((m) => m.id === resolvedModuleId)?.domains ?? [];
            const slug = initialDomainSlug.current;
            const fromUrl = slug ? domains.find((d) => moduleSlug(d.name) === slug) : undefined;
            return fromUrl ? String(fromUrl.id) : current;
          });
          setStatus("ready");
        })
        .catch((error) => {
          if (controller.signal.aborted || seq !== requestSeq.current) return;
          loadingBoard.current = false;
          console.error(error);
          // A failed silent refresh keeps the board that is already showing.
          if (!silent) setStatus("error");
        });
      return () => controller.abort();
    },
    [selectedSectionId],
  );

  // Waits for the section list so it never asks for a guessed section; with no section at all
  // it loads the curriculum without any schedule or completion.
  useEffect(() => {
    if (sectionsLoading) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the board is hidden until this section's data arrives */
    return loadBoard(false);
  }, [sectionsLoading, loadBoard, reloadKey]);

  // Re-reads completion without the loading screen when learner work may have changed.
  const refreshBoard = useCallback(() => {
    if (!sectionsLoading && !loadingBoard.current) loadBoard(true);
  }, [sectionsLoading, loadBoard]);
  // A learner finished a digital game or a practical demonstration (the shell's polled bell).
  const newestFinish = useShell()?.notifications.items[0]?.id;
  useEffect(() => {
    if (newestFinish !== undefined) refreshBoard();
  }, [newestFinish, refreshBoard]);
  // Back from another window, e.g. after rating a practical in the classroom window.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshBoard();
    };
    window.addEventListener("focus", refreshBoard);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshBoard);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshBoard]);

  // Mirror the current selection into the URL so it can be restored when the
  // teacher comes back from a lesson (and so a refresh or bookmark keeps the
  // same view). replace, not push: picking a module is not a history step.
  // Starts from the current URL so each change keeps the other parameters.
  const syncUrl = useCallback(
    (moduleId: number | null, quarterId: string, sectionId: string | null, domainId?: string) => {
      const mod = modules.find((m) => m.id === moduleId);
      const quarter = quarters.find((q) => String(q.quarterId) === quarterId);
      const domain = mod?.domains.find((d) => String(d.id) === domainId);
      const params = new URLSearchParams(searchParams.toString());
      if (mod) params.set("module", moduleSlug(mod.moduleName));
      if (quarter) params.set("quarter", quarterSlug(quarter.quarterName));
      if (domain) params.set("domain", moduleSlug(domain.name));
      else params.delete("domain");
      if (sectionId) params.set("section", sectionId);
      else params.delete("section");
      router.replace(`/teacher/module?${params.toString()}`, { scroll: false });
    },
    [modules, quarters, router, searchParams],
  );

  // A missing or invalid ?section= is replaced by the section actually shown.
  useEffect(() => {
    if (!sectionsLoading && urlSectionId !== selectedSectionId) {
      syncUrl(selectedModuleId, activeQuarter, selectedSectionId, effectiveDomainId);
    }
  }, [sectionsLoading, urlSectionId, selectedSectionId, selectedModuleId, activeQuarter, effectiveDomainId, syncUrl]);

  const handleSectionChange = (sectionId: string) => {
    setPickedSectionId(sectionId);
    try {
      localStorage.setItem(SECTION_STORAGE_KEY, sectionId);
    } catch {
      // Private mode, disabled storage, etc. — the URL still carries the choice this visit.
    }
    syncUrl(selectedModuleId, activeQuarter, sectionId, effectiveDomainId);
  };

  const handleSelectModule = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    syncUrl(moduleId, activeQuarter, selectedSectionId);
  };

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    syncUrl(selectedModuleId, activeQuarter, selectedSectionId, domainId);
  };

  const handleQuarterChange = (quarterId: string) => {
    setActiveQuarter(quarterId);
    syncUrl(selectedModuleId, quarterId, selectedSectionId, effectiveDomainId);
  };

  const [openWeek, setOpenWeek] = useState<{
    moduleId: number;
    moduleName: string;
    quarter: number;
    week: number;
    lessonIds?: number[];
    /** Opened by the board's "+ Practical Activity": straight to the new-activity form. */
    adding?: boolean;
  } | null>(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [addingModule, setAddingModule] = useState(false);

  // Reload rather than append: the board's schedule and order come from the API.
  const handleModuleCreated = (module: CreatedModule) => {
    setSelectedModuleId(module.id);
    setReloadKey((key) => key + 1);
    // syncUrl looks the module up in the not-yet-reloaded list, so set ?module= directly.
    const params = new URLSearchParams(searchParams.toString());
    params.set("module", moduleSlug(module.moduleName));
    router.replace(`/teacher/module?${params.toString()}`, { scroll: false });
  };
  const [updatingWeek, setUpdatingWeek] = useState<number | null>(null);

  const handleLessonChanged = (lessonId: number, changes: Partial<Lesson>) => {
    // A title decides which lessons merge into one card, so a rename can change the card's
    // required activities: its week's badges blank out until the API recomputes them.
    const renamed = "lessonName" in changes ? modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId) : undefined;
    const sameWeek = (l: Lesson) =>
      renamed !== undefined && l.domainId === renamed.domainId && l.quarterId === renamed.quarterId && l.week === renamed.week;
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => {
          const next = l.id === lessonId ? { ...l, ...changes } : l;
          return sameWeek(l) ? { ...next, completion: null } : next;
        }),
      })),
    );
    if (renamed) refreshBoard();
  };

  const handleLessonCreated = useCallback((lesson: CreatedLesson) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === lesson.moduleId
          ? // Keeps the API's order, so the new lesson lands under its day.
            { ...m, lessons: [...m.lessons, lesson].sort((a, b) => (a.dayOfWeek ?? 8) - (b.dayOfWeek ?? 8)) }
          : m,
      ),
    );
    refreshBoard();
  }, [refreshBoard]);

  return (
    // No overflow-hidden on this root: it would clip PageHeader's full-bleed
    // negative margins. The Tabs block below clips its own scroll area.
    <div className="h-full flex flex-col">
      <PageHeader className="shrink-0 mb-3" />

      <section className="shrink-0 mb-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Modules &amp; Weekly Lessons
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Browse each module&apos;s weekly lessons, daily schedule, and activities across quarters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="modules-section" className="text-xs font-bold text-gray-700 shrink-0">
              Section
            </label>
            {sections.length === 0 ? (
              <select id="modules-section" disabled className={SELECT_CLASS}>
                <option>
                  {sectionsLoading
                    ? "Loading sections…"
                    : sectionsFailed
                      ? "Could not load sections"
                      : "No sections available."}
                </option>
              </select>
            ) : (
              <select
                id="modules-section"
                value={selectedSectionId ?? ""}
                onChange={(e) => handleSectionChange(e.target.value)}
                className={SELECT_CLASS}
              >
                {sections.map((s) => (
                  <option key={s.sectionId} value={s.sectionId}>
                    {s.gradeLevel} - {s.sectionName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {activeModule && (
            <button
              onClick={() => setAddingLesson(true)}
              disabled={!!quarterLock(activeQuarterId)}
              title={quarterLock(activeQuarterId) ?? undefined}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-sidebar hover:bg-[#7e1422] rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-sidebar disabled:hover:shadow-md"
            >
              <Plus size={16} className="text-amber-300" />
              Add Lesson
            </button>
          )}
        </div>
      </section>

      {/* Quarter Tabs */}
      <Tabs
        value={activeQuarter}
        onValueChange={handleQuarterChange}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <TabsList variant="line" className="overflow-hidden shrink-0">
          {quarters.map((quarter) => {
            const Icon = quarterLock(quarter.quarterId) ? Lock : LockOpen;
            return (
              <TabsTrigger
                key={quarter.quarterId}
                value={String(quarter.quarterId)}
                title={quarterTip(quarter.quarterId)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold whitespace-nowrap text-gray-800 data-active:text-sidebar after:bg-sidebar"
              >
                <Icon
                  size={14}
                  aria-hidden="true"
                  // The school year's active quarter (open for classes), whichever tab is selected: gold lock body (the
                  // icon's <rect>) inside the black outline; the shackle stays unfilled. Upcoming and completed stay plain.
                  className={`text-black ${quarter.quarterId === classQuarter ? "[&_rect]:fill-sidebar-primary" : ""}`}
                />
                <span>{quarter.quarterName}</span>
                <span className="sr-only">{quarterState(quarter.quarterId)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Master-Detail Layout */}
        {status === "loading" ? (
          <PageLoader />
        ) : status === "error" ? (
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-12 text-center flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center">
              <AlertTriangle size={40} className="text-red-500 mb-4" />
              <p className="text-gray-800 text-sm mb-4">
                Couldn&apos;t load modules. Check your connection and try again.
              </p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-4 py-2 rounded-lg bg-sidebar text-white text-sm font-semibold hover:bg-[#4d050d] transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : modules.length > 0 ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[19rem_1fr] lg:grid-rows-1 gap-4 overflow-y-auto lg:overflow-hidden pt-3 pb-1">
            {/* Left Column: Module List */}
            <aside className="min-h-0 bg-white rounded-2xl border border-stone-200/80 shadow-sm p-3.5 flex flex-col">
              <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 shrink-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Modules List
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-sidebar border border-rose-100">
                  {modules.length} Modules Active
                </span>
              </div>
              <ul className="mt-2 space-y-1 min-h-0 overflow-y-auto">
                {modules.map((mod) => {
                  const isActive = mod.id === selectedModuleId;
                  const quarterLessons = mod.lessons.filter((l) => l.quarterId === activeQuarterId);
                  const weeksPlanned = new Set(quarterLessons.map((l) => l.week)).size;
                  return (
                    <li key={mod.id}>
                      <button
                        onClick={() => handleSelectModule(mod.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`group w-full text-left rounded-xl px-2.5 py-2 flex items-center gap-2.5 border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40 ${
                          isActive
                            ? "bg-sidebar text-white shadow-md border-sidebar-deep"
                            : "border-transparent text-stone-800 hover:border-stone-200 hover:bg-stone-50"
                        }`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold truncate ${isActive ? "text-white" : "group-hover:text-sidebar transition-colors"}`}
                            >
                              {mod.moduleName}
                            </span>
                            {isActive && ( // impeccable-disable-next-line gray-on-color -- near-black on amber, strong contrast
                              <span className="text-[10px] bg-amber-400 text-stone-900 px-1.5 rounded font-bold uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </span>
                          <span
                            className={`block text-xs mt-0.5 ${isActive ? "text-rose-200" : weeksPlanned ? "text-stone-500" : "text-stone-400"}`}
                          >
                            {weeksPlanned} {weeksPlanned === 1 ? "Week" : "Weeks"} Planned
                            {quarterLessons.length > 0 &&
                              ` • ${quarterLessons.length} ${quarterLessons.length === 1 ? "Lesson" : "Lessons"}`}
                          </span>
                        </span>
                        <ChevronRight
                          size={isActive ? 20 : 16}
                          className={`shrink-0 transition-transform ${isActive ? "text-amber-300" : "text-stone-400 group-hover:translate-x-0.5"}`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setAddingModule(true)}
                disabled={!!moduleLock}
                title={moduleLock ?? undefined}
                aria-describedby={moduleHint ? "add-module-lock" : undefined}
                className="mt-2 shrink-0 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-2.5 py-2 text-xs font-semibold text-stone-600 hover:border-sidebar/40 hover:bg-rose-50 hover:text-sidebar transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:text-stone-600"
              >
                <Plus size={14} />
                Add Module
              </button>
              {/* Shown, not just a tooltip: touch screens never hover. */}
              {moduleHint && (
                <p id="add-module-lock" className="mt-1.5 shrink-0 px-1 text-[11px] leading-snug text-stone-500">
                  {moduleHint}
                  {yearFailed && schoolYear === undefined && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => void reloadActiveSchoolYear()}
                        className="font-semibold text-sidebar underline underline-offset-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40 rounded"
                      >
                        Try again
                      </button>
                    </>
                  )}
                </p>
              )}
            </aside>

            {/* Right Column: Module Detail */}
            <div className="min-w-0 min-h-0 flex flex-col gap-3">
              {activeModule && (
                <>
                  <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-sidebar bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          Module {modules.indexOf(activeModule) + 1}
                        </span>
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          {activeQuarterLabel}
                        </span>
                        {activeModule.domains.length > 0 && (
                          <span className="text-xs text-stone-500 font-medium">
                            {activeModule.domains.map((d) => d.name).join(" • ")}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                        {activeModule.moduleName}: List of Lessons
                      </h3>
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                        <Clock size={14} className="shrink-0 text-stone-400" />
                        <span>
                          Schedule: <strong>{formatSchedule(activeModule.scheduleDays)}</strong>
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 bg-[#faf8f5] px-3 py-2 rounded-xl border border-stone-200 min-w-40 grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold leading-tight text-sidebar">{activeQuarterLessons.length}</p>
                        <p className="text-[10px] text-stone-500 uppercase tracking-wider">Lessons</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-tight text-sidebar">
                          {activeQuarterLessons.reduce((sum, l) => sum + l.activityCount, 0)}
                        </p>
                        <p className="text-[10px] text-stone-500 uppercase tracking-wider">Activities</p>
                      </div>
                    </div>
                  </div>

                  <LessonGroups
                    key={`${activeModule.id}-${activeQuarterId}`}
                    lessons={activeQuarterLessons}
                    days={classDays(activeModule.scheduleDays)}
                    time={
                      activeModule.scheduleDays[0]
                        ? `${activeModule.scheduleDays[0].startTime} – ${activeModule.scheduleDays[0].endTime}`
                        : ""
                    }
                    domains={activeModule.domains}
                    selectedDomainId={effectiveDomainId}
                    onDomainChange={handleDomainChange}
                    onUpdate={setUpdatingWeek}
                    quarterLock={quarterLock(activeQuarterId)}
                    firstVideoOnly={firstVideoOnly(activeQuarterId)}
                    onOpen={(week, lessonIds, adding) =>
                      setOpenWeek({
                        moduleId: activeModule.id,
                        moduleName: activeModule.moduleName,
                        quarter: activeQuarterId,
                        week,
                        lessonIds,
                        adding,
                      })
                    }
                  />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-12 text-center flex items-center justify-center overflow-hidden">
            <div>
              <BookOpen size={40} className="text-gray-800 mx-auto mb-4" />
              <p className="text-gray-800 text-sm">No modules available.</p>
            </div>
          </div>
        )}
      </Tabs>
      {addingLesson && activeModule && (
        <AddLessonForm
          open
          onOpenChange={setAddingLesson}
          module={activeModule}
          quarterId={activeQuarterId}
          quarterLabel={activeQuarterLabel}
          onCreated={handleLessonCreated}
        />
      )}
      {addingModule && (
        <AddModuleForm onClose={() => setAddingModule(false)} onCreated={handleModuleCreated} />
      )}
      {updatingWeek !== null && activeModule && (
        <UpdateLessonsModal
          onClose={() => setUpdatingWeek(null)}
          moduleName={activeModule.moduleName}
          week={updatingWeek}
          days={classDays(activeModule.scheduleDays)}
          lessons={activeModule.lessons.filter(
            (l) => l.quarterId === activeQuarterId && l.week === updatingWeek && l.domainId === Number(effectiveDomainId),
          )}
          onLessonChanged={handleLessonChanged}
          quarterLock={quarterLock(activeQuarterId)}
          firstVideoOnly={firstVideoOnly(activeQuarterId)}
        />
      )}
      {openWeek && (
        <WeekLessonsModal
          open
          onClose={() => setOpenWeek(null)}
          moduleName={openWeek.moduleName}
          moduleId={openWeek.moduleId}
          quarter={openWeek.quarter}
          week={openWeek.week}
          lessonIds={openWeek.lessonIds}
          adding={openWeek.adding}
          quarterLock={quarterLock(openWeek.quarter)}
          firstVideoOnly={firstVideoOnly(openWeek.quarter)}
          onActivityCountChange={(lessonId, delta) => {
            setModules((prev) =>
              prev.map((m) => ({
                ...m,
                lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, activityCount: l.activityCount + delta } : l)),
              })),
            );
            // A new or removed activity changes what the card requires.
            refreshBoard();
          }}
        />
      )}
    </div>
  );
}
