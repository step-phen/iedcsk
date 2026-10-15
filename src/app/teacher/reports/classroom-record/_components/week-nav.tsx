"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";

const STEP_CLASS =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-gray-700 shadow-xs outline-none transition-[background-color,transform] duration-100 ease-out hover:bg-stone-100 active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100";

/** Previous / week picker / next for the By Week view; only ?week= changes, every other filter stays. */
export default function WeekNav({ week, weeks }: { week: number; weeks: { week: number; hasActivities: boolean }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Steps read the week from the last render, so they wait for the previous step to land.
  const [pending, startTransition] = useTransition();
  const go = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("week", String(next));
    startTransition(() => router.push(`${pathname}?${params}`, { scroll: false }));
  };
  const at = weeks.findIndex((w) => w.week === week);

  return (
    <div role="group" aria-label="Week" aria-busy={pending} className="flex items-center gap-1.5">
      <button type="button" aria-label="Previous week" disabled={pending || at <= 0} onClick={() => go(weeks[at - 1].week)} className={STEP_CLASS}>
        <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <select
        aria-label="Week"
        value={week}
        onChange={(e) => go(Number(e.target.value))}
        disabled={pending}
        className={`${SELECT_CLASS} disabled:opacity-60`}
      >
        {weeks.map((w) => (
          <option key={w.week} value={w.week}>
            {`Week ${w.week}${w.hasActivities ? "" : " (no activities)"}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next week"
        disabled={pending || at === -1 || at >= weeks.length - 1}
        onClick={() => go(weeks[at + 1].week)}
        className={STEP_CLASS}
      >
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
