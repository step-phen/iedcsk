import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DashboardCard,
  DashboardCardHeader,
  DashboardCardPill,
} from "@/components/ui/dashboard-card";

export type ClassSlot = { moduleName: string; startTime: string; endTime: string };

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

// The selected section's weekly timetable, Monday to Friday, from its class
// schedules in the database. `slotsByDay` keys are the API's weekday names
// ("MONDAY"), each day's slots already in start-time order.
export default function ClassScheduleCard({
  sectionLabel,
  todayName,
  slotsByDay,
}: {
  /** null when the teacher has no section yet. */
  sectionLabel: string | null;
  todayName: string;
  slotsByDay: Record<string, ClassSlot[]>;
}) {
  const hasSlots = WEEKDAYS.some((day) => slotsByDay[day]?.length);

  return (
    <DashboardCard>
      <DashboardCardHeader
        icon={<CalendarClock className="w-5 h-5 text-white" aria-hidden="true" />}
        title="Class Schedule"
      >
        {sectionLabel && <DashboardCardPill>{sectionLabel}</DashboardCardPill>}
      </DashboardCardHeader>

      {/* One row per weekday, classes left to right, at the same fixed body
          height as Today's Schedule beside it so the two cards line up.
          Hidden while a section switch loads, so the previous section's
          timetable never shows under the new one. */}
      <div className="h-[17.5rem] overflow-y-auto group-has-data-pending:hidden">
        {hasSlots ? (
          <div className="divide-y divide-gray-300">
            {WEEKDAYS.map((day) => {
              const isToday = day === todayName;
              const slots = slotsByDay[day] ?? [];
              return (
                <section
                  key={day}
                  aria-label={day}
                  className={cn("flex gap-3 px-4 py-1", isToday && "bg-[#5b0610]/20 shadow-[inset_4px_0_0_#5b0610]")}
                >
                  <h3
                    className={cn(
                      "w-12 shrink-0 pt-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                      isToday ? "text-[#5b0610]" : "text-gray-600",
                    )}
                  >
                    {day.slice(0, 3)}
                    {isToday && (
                      <span className="mt-1 block w-fit rounded-full bg-[#5b0610] px-1.5 py-px text-[9px] tracking-wider text-white">
                        Today
                      </span>
                    )}
                  </h3>
                  {slots.length > 0 ? (
                    <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {slots.map((slot) => (
                        <li
                          key={`${slot.moduleName}-${slot.startTime}`}
                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-0.5"
                        >
                          <p className="text-sm font-semibold text-gray-900">{slot.moduleName}</p>
                          <p className="text-xs text-gray-600 whitespace-nowrap">
                            {slot.startTime} – {slot.endTime}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pt-1 text-xs text-gray-500">No classes</p>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            {sectionLabel ? "No class schedule set for this section." : "No sections available."}
          </p>
        )}
      </div>
      <p className="hidden group-has-data-pending:flex h-[17.5rem] items-center justify-center px-5 text-center text-sm text-gray-500">
        Loading schedule…
      </p>
    </DashboardCard>
  );
}
