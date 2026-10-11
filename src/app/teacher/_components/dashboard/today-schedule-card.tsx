import { CalendarDays } from "lucide-react";
import {
  DashboardCard,
  DashboardCardHeader,
} from "@/components/ui/dashboard-card";

export type ScheduledLesson = {
  lessonId: number;
  lessonName: string;
  quarterName: string;
  week: number;
  module: { moduleId: number; moduleName: string } | null;
  activities: { activityId: number; activityName: string }[];
};

// Today's lessons for the current quarter and week; `todayName` comes from the server in PH time, never the browser clock.
export default function TodayScheduleCard({
  todayName,
  quarterName,
  week,
  lessons,
  moduleTimes,
}: {
  todayName: string;
  quarterName: string;
  /** null when there's no active quarter — the week number is meaningless then, so it's left off. */
  week: number | null;
  lessons: ScheduledLesson[];
  moduleTimes: Map<number, { start: string; end: string }>;
}) {
  // DayOfWeek has no weekend members, so a weekend is "no classes" rather than
  // "nothing scheduled".
  const isSchoolDay = todayName !== "SATURDAY" && todayName !== "SUNDAY";

  return (
    <DashboardCard>
      <DashboardCardHeader
        icon={<CalendarDays className="w-5 h-5 text-white" aria-hidden="true" />}
        title="Today's Schedule"
      >
        <span className="text-xs font-bold text-white/90 uppercase tracking-wider whitespace-nowrap">
          {week !== null ? `${quarterName}, Week ${week}` : quarterName}
        </span>
      </DashboardCardHeader>

      {/* Fixed height so the card's size doesn't depend on how many lessons
          are scheduled today — a light day and a packed day render the same
          height, with extra rows scrolling inside instead of growing the
          card. */}
      <div className="h-[17.5rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left sticky top-0 z-10">
              <th scope="col" className="px-5 py-2.5 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em]">
                Time
              </th>
              <th scope="col" className="px-5 py-2.5 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em]">
                Module
              </th>
              <th scope="col" className="px-5 py-2.5 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em]">
                Lesson
              </th>
              <th scope="col" className="px-5 py-2.5 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em]">
                Activities
              </th>
            </tr>
          </thead>
          <tbody className="group-has-data-pending:hidden">
            {lessons.length > 0 ? (
              lessons.map((lesson, i) => (
                <tr
                  key={lesson.lessonId}
                  className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                >
                  <td className="px-5 py-3 text-gray-800 whitespace-nowrap">
                    {lesson.module && moduleTimes.get(lesson.module.moduleId) ? (
                      <>
                        {moduleTimes.get(lesson.module.moduleId)!.start}
                        {" – "}
                        {moduleTimes.get(lesson.module.moduleId)!.end}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-800">
                    {lesson.module?.moduleName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-800">
                    {lesson.lessonName}
                  </td>
                  <td className="px-5 py-3">
                    {lesson.activities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {lesson.activities.map((activity) => (
                          <span
                            key={activity.activityId}
                            className="inline-block text-sm font-semibold px-2 py-0.5 rounded-full bg-[#5b0610]/10 text-[#5b0610] whitespace-nowrap"
                          >
                            {activity.activityName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No activity yet</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-gray-500 text-sm"
                >
                  {isSchoolDay
                    ? `No lessons scheduled for ${todayName}.`
                    : `No classes on ${todayName}.`}
                </td>
              </tr>
            )}
          </tbody>
          {/* Only while a section switch is loading (the dashboard's `group`
              has a data-pending descendant): the rows above belong to the
              previous section, so they're swapped for this. */}
          <tbody className="hidden group-has-data-pending:table-row-group">
            <tr>
              <td colSpan={4} className="px-5 py-12 text-center text-gray-500 text-sm">
                Loading schedule…
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
