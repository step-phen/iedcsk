import type { Metadata } from "next";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { currentWeekdayPH, todayDatePH, weekNumberFrom } from "@/lib/datetime";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import DashboardActions from "./_components/dashboard/dashboard-actions";
import SectionSelector from "./_components/dashboard/section-selector";
import TodayScheduleCard from "./_components/dashboard/today-schedule-card";
import ClassScheduleCard, { type ClassSlot } from "./_components/dashboard/class-schedule-card";import AnimatedNumber from "@/components/ui/animated-number";
import AnimatedProgressBar from "@/components/ui/animated-progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Section } from "@/types/db";

// Capped staggered entrance for a row of sibling cards — restarts at 0 within
// each grid rather than accumulating across the page, so no row ever waits
// on the one above it.
const CARD_ENTRANCE =
  "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both ease-out duration-500 motion-reduce:animate-none";

const STAT_CARD_CLASS =
  "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md hover:-translate-y-1 transition-[transform,box-shadow] duration-300";

export const metadata: Metadata = {
  title: "IEDCSK | Dashboard",
  description:
    "Interactive Developmental Checklist for Kindergarten Learners at SPC",
};

/**
 * A stat card shows one of: a single `value`, a row of captioned `parts` (e.g.
 * lessons and activities side by side), or a labelled `progress` bar.
 */
type StatCard = {
  label: string;
  icon: LucideIcon;
  color: string;
  value?: string;
  count?: number;
  /** Small line under `count`, e.g. a breakdown of it. */
  caption?: string;
  /** Makes the whole card a link to this page. */
  href?: string;
  parts?: { count: number; label: string }[];
  progress?: { label: string; percent: number };
};

// A link when the card has somewhere to go, a plain div otherwise.
function StatCardShell({
  href,
  ...props
}: {
  href?: string;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  return href ? <Link href={href} {...props} /> : <div {...props} />;
}

export default async function TeacherDashboard({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const teacher = await requireTeacher();
  const { section } = await searchParams;

  // Today's weekday in PH time, from the server — never the browser clock.
  const todayName = currentWeekdayPH();

  // Teacher's sections this school year; a failed fetch is an empty selector,
  // not a broken dashboard.
  const sections = await serverApi("/api/sections")
    .then(async (res) => (res.ok ? ((await res.json()) as Section[]) : []))
    .catch(() => []);
  // The selected section's ID is the state Steps 3+ filter by — everything
  // downstream should key off this, not off sectionName. `sections` only
  // ever holds this teacher's own current sections, so a `?section=` that's
  // stale (deleted, transferred, another teacher's) simply fails to match
  // and falls through to the first section — same fallback Step 8 asks for.
  const selectedSection =
    sections.find((s) => String(s.sectionId) === section) ?? sections[0] ?? null;
  const selectedSectionId = selectedSection?.sectionId ?? null;

  // Learners in the *selected* section only; no section selected (empty
  // roster) means no learners to fetch. A failed fetch shows 0 rather than
  // breaking the dashboard.
  const learners = selectedSectionId
    ? await serverApi(`/api/learners?section=${selectedSectionId}`)
        .then(async (res) => (res.ok ? ((await res.json()) as { gender: string | null }[]) : []))
        .catch(() => [])
    : [];
  const maleCount = learners.filter((l) => l.gender === "Male").length;
  const femaleCount = learners.filter((l) => l.gender === "Female").length;

  // Lesson/activity counts for the selected section's own modules; no
  // section or a failed fetch reads as 0 of each.
  const curriculumResources = selectedSectionId
    ? await serverApi(`/api/sections/${selectedSectionId}/curriculum-resources`)
        .then(async (res) =>
          res.ok ? ((await res.json()) as { lessonCount: number; activityCount: number }) : { lessonCount: 0, activityCount: 0 },
        )
        .catch(() => ({ lessonCount: 0, activityCount: 0 }))
    : { lessonCount: 0, activityCount: 0 };
  const { lessonCount, activityCount } = curriculumResources;

  // The selected section's ongoing class, if any; no section or a failed fetch reads as no active class.
  const activeSession = selectedSectionId
    ? await serverApi(`/api/sections/${selectedSectionId}/active-session`)
        .then(async (res) =>
          res.ok ? ((await res.json()) as { activeActivityName: string | null; activeModuleName: string | null }) : null,
        )
        .catch(() => null)
    : null;

  // The selected section's active quarter and how much of it is done; no
  // section, no active quarter, a failed fetch, or a malformed body (percent
  // isn't a real number, startDate isn't a date) all read as "no quarter" —
  // never a percent to format, never a NaN card or week.
  const currentQuarter = selectedSectionId
    ? await serverApi(`/api/sections/${selectedSectionId}/overall-progress`)
        .then(async (res) => {
          if (!res.ok) return null;
          const data = (await res.json()) as {
            quarterId: number;
            quarterName: string;
            startDate: string;
            percent: number;
          } | null;
          return data &&
            typeof data.percent === "number" &&
            Number.isFinite(data.percent) &&
            /^\d{4}-\d{2}-\d{2}$/.test(String(data.startDate))
            ? data
            : null;
        })
        .catch(() => null)
    : null;

  // Today's lessons (already scoped to today's weekday and the active
  // quarter server-side) and today's class times, for the selected section
  // only. No section or a failed fetch reads as an empty schedule.
  type TodaysLesson = {
    lessonId: number;
    lessonName: string;
    week: number;
    moduleId: number;
    moduleName: string;
    moduleCode: string;
    domainName: string | null;
    activities: { activityId: number; activityName: string }[];
  };
  type TodaysModuleTime = { moduleId: number; startTime: string; endTime: string };

  const todaysSchedule = selectedSectionId
    ? await serverApi(`/api/sections/${selectedSectionId}/todays-schedule`)
        .then(async (res) =>
          res.ok
            ? ((await res.json()) as { lessons: TodaysLesson[]; moduleTimes: TodaysModuleTime[] })
            : { lessons: [], moduleTimes: [] },
        )
        .catch(() => ({ lessons: [], moduleTimes: [] }))
    : { lessons: [], moduleTimes: [] };
  const { lessons: todaysLessons, moduleTimes: todaysModuleTimes } = todaysSchedule;

  // Which week of the active quarter today falls in, counted from that
  // quarter's own start date (Week 1 = its first 7 days, PH calendar). A
  // quarter set active before it starts reads as Week 1. No active quarter
  // means no week.
  const currentWeek = currentQuarter
    ? Math.max(
        1,
        weekNumberFrom(new Date(`${currentQuarter.startDate}T00:00:00.000Z`), todayDatePH()),
      )
    : null;

  // The backend already scoped todaysLessons to today's weekday and the
  // active quarter; only the quarter week (a date calculation) is narrowed here.
  const scheduleLessons = todaysLessons
    .filter((lesson) => lesson.week === currentWeek)
    .map((lesson) => ({
      lessonId: lesson.lessonId,
      lessonName: lesson.lessonName,
      quarterName: currentQuarter?.quarterName ?? "",
      week: lesson.week,
      // MAPEH is one module over three domains; its domain tells the rows apart.
      module: {
        moduleId: lesson.moduleId,
        moduleName:
          lesson.moduleCode === "mapeh" && lesson.domainName
            ? `${lesson.moduleName} - ${lesson.domainName}`
            : lesson.moduleName,
      },
      activities: lesson.activities.map((activity) => ({
        activityId: activity.activityId,
        activityName: activity.activityName,
      })),
    }));

  // The selected section's weekly timetable, from the same section-scoped
  // endpoint the Modules page uses (its scheduleDays only; lessons are ignored
  // here). No section or a failed fetch reads as no timetable.
  type ModuleSchedule = { moduleName: string; scheduleDays: { day: string; startTime: string; endTime: string }[] };
  const sectionModules = selectedSectionId
    ? await serverApi(`/api/modules?section=${selectedSectionId}`)
        .then(async (res) => (res.ok ? ((await res.json()) as ModuleSchedule[]) : []))
        .catch(() => [])
    : [];
  // "8:00 AM" -> minutes since midnight, to order each day's classes.
  const minutes = (time: string) => {
    const [, h, m, meridiem] = /(\d+):(\d+)\s*(AM|PM)/.exec(time) ?? [, "0", "0", "AM"];
    return (Number(h) % 12) * 60 + Number(m) + (meridiem === "PM" ? 720 : 0);
  };
  const slotsByDay: Record<string, ClassSlot[]> = {};
  for (const mod of sectionModules) {
    for (const { day, startTime, endTime } of mod.scheduleDays) {
      (slotsByDay[day] ??= []).push({ moduleName: mod.moduleName, startTime, endTime });
    }
  }
  for (const slots of Object.values(slotsByDay)) {
    slots.sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
  }

  const moduleTimes = new Map(
    todaysModuleTimes.map((slot) => [slot.moduleId, { start: slot.startTime, end: slot.endTime }]),
  );

  const stats: StatCard[] = [
    {
      label: "Total Learners",
      href: "/teacher/learners",
      count: learners.length,
      caption: `${maleCount} Male • ${femaleCount} Female`,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Today's Activity",
      value:
        activeSession?.activeActivityName ??
        activeSession?.activeModuleName ??
        "No Active Class",
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Curriculum Resources",
      href: "/teacher/module",
      // Two counts in one card, each captioned — "88 | 8" alone doesn't say
      // which number is which.
      parts: [
        { count: lessonCount, label: "Lessons" },
        { count: activityCount, label: "Activities" },
      ],
      icon: ListChecks,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Overall Progress",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      ...(currentQuarter
        ? {
            progress: {
              label: currentQuarter.quarterName,
              percent: currentQuarter.percent,
            },
          }
        : { value: "No quarters yet" }),
    },
  ];

  return (
    // `group` lets the section-dependent area below react to the Section
    // selector's data-pending (set while a section switch is loading).
    <div className="group space-y-3 font-poppins">
      <PageHeader className="mb-3" />

      {/* ─── Page-bg header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Welcome back, {teacher.teacherName ?? teacher.username}!
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Here&apos;s what&apos;s happening in your class today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SectionSelector sections={sections} selectedSectionId={selectedSectionId} />
          <DashboardActions />
        </div>
      </div>

      {/* ─── Section-dependent area ───
          Dims while a section switch is loading. The fade sits on this plain
          wrapper, not on the cards: their CARD_ENTRANCE animation fills
          opacity and would override an opacity class on the same element. */}
      <div className="space-y-3 transition-opacity duration-200 ease-out group-has-data-pending:opacity-50">
        {/* ─── Stats Grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <StatCardShell
                key={stat.label}
                href={stat.href}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`${STAT_CARD_CLASS} ${CARD_ENTRANCE} ${stat.href ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2" : ""}`}
              >
                <div className={`shrink-0 self-start p-3 rounded-xl ${stat.color}`}>
                  <Icon size={22} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  {/* While a section switch loads, the value is hidden (layout
                      kept, no height jump) behind a skeleton, so the previous
                      section's number never reads as the new one's. */}
                  <div className="relative">
                    <Skeleton aria-hidden className="absolute inset-0 max-w-32 hidden group-has-data-pending:block" />
                    <div className="group-has-data-pending:invisible">
                      {stat.count !== undefined ? (
                        <div className="flex items-baseline flex-wrap gap-x-2">
                          <AnimatedNumber
                            value={stat.count}
                            className="text-xl font-bold text-gray-900 tracking-tight leading-none"
                          />
                          {stat.caption && (
                            <span className="text-xs font-semibold text-gray-500">{stat.caption}</span>
                          )}
                        </div>
                      ) : stat.progress ? (
                        // Label and percent share the top line, bar spans the full
                        // card width underneath.
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-500">
                              {stat.progress.label}
                            </span>
                            <AnimatedNumber
                              value={stat.progress.percent}
                              suffix="%"
                              className="text-xl font-bold text-gray-900 tracking-tight leading-none"
                            />
                          </div>
                          {/* Color now encodes state (red/amber/emerald by percent)
                              instead of a fixed purple that meant nothing. */}
                          <AnimatedProgressBar
                            percent={stat.progress.percent}
                            label={`${stat.progress.label} progress`}
                          />
                        </div>
                      ) : stat.parts ? (
                        <div className="flex items-center gap-4">
                          {stat.parts.map((part, i) => (
                            <Fragment key={part.label}>
                              {i > 0 && <div className="h-8 w-px bg-gray-100"></div>}
                              <div className="flex flex-col">
                                <AnimatedNumber
                                  value={part.count}
                                  className="text-xl font-bold text-gray-900 tracking-tight leading-none"
                                />
                                <span className="text-xs font-semibold text-gray-500 mt-1">
                                  {part.label}
                                </span>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-900 line-clamp-2 tracking-tight leading-tight">
                          {stat.value}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </StatCardShell>
            );
          })}
        </div>

        {/* ─── Row 2: Today's Schedule | Class Schedule (stacked below xl) ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {/* min-w-0: lets the card's table scroll inside it instead of
              widening the grid column past the screen. */}
          <div className={`min-w-0 ${CARD_ENTRANCE}`} style={{ animationDelay: "120ms" }}>
            <TodayScheduleCard
              todayName={todayName}
              quarterName={currentQuarter?.quarterName ?? "No quarter set"}
              week={currentWeek}
              lessons={scheduleLessons}
              moduleTimes={moduleTimes}
            />
          </div>

          <div className={CARD_ENTRANCE} style={{ animationDelay: "180ms" }}>
            <ClassScheduleCard
              sectionLabel={selectedSection ? `${selectedSection.gradeLevel} - ${selectedSection.sectionName}` : null}
              todayName={todayName}
              slotsByDay={slotsByDay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
