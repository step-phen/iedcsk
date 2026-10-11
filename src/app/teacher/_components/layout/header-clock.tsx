"use client";

import { useSyncExternalStore } from "react";
import { Calendar } from "lucide-react";
import { formatDatePH, formatTimePH } from "@/lib/datetime";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "short",
  day: "numeric",
};

// The clock is an external mutable source, so it's read through
// useSyncExternalStore rather than a setState-on-an-interval: getSnapshot has
// to return a cached value (a fresh Date every call would re-render forever),
// and getServerSnapshot gives React something stable for the SSR pass.
let cachedNow = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  // The cached value dates from module load, which may be well in the past by
  // the time anything subscribes.
  cachedNow = Date.now();

  timer ??= setInterval(() => {
    cachedNow = Date.now();
    for (const listener of listeners) listener();
  }, 1000);

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => cachedNow;
/** null on the server: the one thing here the server can't render. */
const getServerSnapshot = () => null;

/**
 * The date and a ticking clock in the header's right-hand corner.
 *
 * Its own component rather than part of PageHeader so the once-a-second
 * re-render stays here — PageHeader also draws the sidebar toggle with its
 * cross-fading icons, which has no reason to re-render 3600 times an hour.
 *
 * `initialDate` is the string the server formatted (see teacher/layout.tsx).
 * The time can't come from the server the same way: rendering `new Date()`
 * during SSR would disagree with the client a moment later, so the server pass
 * shows the date alone and the time appears once hydrated.
 */
export default function HeaderClock({ initialDate }: { initialDate: string }) {
  const nowMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const now = nowMs === null ? null : new Date(nowMs);

  // Once mounted the date comes off the live clock too, so it no longer goes
  // stale on a tab left open across midnight.
  const date = now ? formatDatePH(now, DATE_FORMAT) : initialDate;

  return (
    // Hidden below sm, where the sidebar toggle is gone too and this would
    // crowd out a page's action button.
    <div className="hidden items-center gap-1.5 px-2.5 py-1 sm:flex">
      <Calendar className="size-[18px] shrink-0 text-gray-700" />
      <span className="whitespace-nowrap text-[13px] font-semibold text-gray-700">
        {date}
      </span>
      {now && (
        <>
          <span className="text-gray-700">&bull;</span>
          {/* tabular-nums and the min-width stop the chip resizing as the
          seconds roll over or the hour goes from one digit to two. */}
          <span className="-ml-3 min-w-[4.25rem] text-right text-[13px] font-semibold tabular-nums text-gray-700">
            {formatTimePH(now)}
          </span>
        </>
      )}
    </div>
  );
}
