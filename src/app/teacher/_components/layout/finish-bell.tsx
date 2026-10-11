"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useShell } from "@/app/teacher/_components/layout/shell-context";
import { LIVE_STATUS_LABEL } from "@/app/teacher/classroom/_components/live-status";

// Header bell listing learners who finished an activity; the shell polls, so every page shares one list.
export default function FinishBell() {
  const notifications = useShell()?.notifications;
  if (!notifications) return null;
  const { items, unread, markRead } = notifications;

  return (
    <>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        popoverTarget="finish-alerts"
        onClick={markRead}
        className="relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-gray-500/10 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-[#5b0610]"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4.5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4.5 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <div
        id="finish-alerts"
        popover="auto"
        className="fixed inset-auto right-4 top-14 m-0 w-80 max-h-96 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-lg"
      >
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent</p>
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-gray-600">No learner has finished an activity yet.</p>
        ) : (
          <ul>
            {items.map((n) => (
              <li key={n.id}>
                {/* Opens that learner's class in the Classroom, where the card can be checked or rated. */}
                <Link
                  href={`/teacher/classroom?section=${n.sectionId}`}
                  onClick={() => document.getElementById("finish-alerts")?.hidePopover()}
                  className="block rounded-lg px-2 py-2 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-[#5b0610]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{n.learnerName}</span>
                    <span className="shrink-0 text-xs text-gray-500">{new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <p className={`text-xs ${n.kind === "needs_rating" ? "font-semibold text-[#5b0610]" : "text-gray-600"}`}>
                    {LIVE_STATUS_LABEL[n.kind === "needs_rating" ? "rate" : "finished"]}
                    {n.activityName && ` · ${n.activityName}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
