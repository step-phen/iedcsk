"use client";

import type { ActiveSession } from "@/types/learner";

interface ClassStatusPillProps {
  activeSession: ActiveSession | null;
  dayEnded: boolean;
}

export default function ClassStatusPill({ activeSession, dayEnded }: ClassStatusPillProps) {
  if (activeSession) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="leading-tight whitespace-nowrap">
          Activity Started
          {activeSession.activeActivityName && `: ${activeSession.activeActivityName}`}
        </span>
      </span>
    );
  }

  if (dayEnded) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Class Ended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
      <span className="leading-tight whitespace-nowrap">Class Not Started</span>
    </span>
  );
}
