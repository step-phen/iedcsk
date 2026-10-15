"use client";

import { Loader2, Play } from "lucide-react";

interface StartClassButtonProps {
  onClick: () => void;
  disabled: boolean;
  isPending: boolean;
  dayEnded: boolean;
  /** Why the button is disabled, shown on hover. */
  reason?: string;
}

export default function StartClassButton({
  onClick,
  disabled,
  isPending,
  dayEnded,
  reason,
}: StartClassButtonProps) {
  return (
    // The tooltip sits on a wrapper: a disabled button has pointer-events-none, so it never gets the hover.
    <span title={reason} className="inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        className="h-9.5 justify-center px-3 rounded-lg font-semibold text-sm text-white bg-[#5b0610] hover:bg-[#4d050d] active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        {dayEnded ? "Class Ended" : "Start Class"}
      </button>
    </span>
  );
}
