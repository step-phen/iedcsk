"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerId: string;
  /** Tailwind max-width class for the panel, e.g. "max-w-md", "max-w-2xl". */
  maxWidth?: string;
  /** Extra classes on the panel itself — height/overflow/scrollbar variants
   *  differ per modal (some scroll the whole panel, some scroll only an
   *  inner region), so callers own that instead of the shell guessing. */
  panelClassName?: string;
  headerPadding?: string;
  /** Tailwind text-size class for the title. */
  titleSize?: string;
  children: ReactNode;
}

/**
 * Shared chrome for the app's full-screen teacher modals: backdrop, centered
 * white panel, maroon header bar. Centralizes what every hand-rolled modal
 * needs but previously reimplemented inconsistently — body scroll lock and
 * Escape-to-close. Stays mounted after `open` turns false until its closing
 * animation ends, and portals to <body> so no transformed ancestor traps it.
 */
export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  headerId,
  maxWidth = "max-w-2xl",
  panelClassName = "",
  headerPadding = "px-6 py-4",
  titleSize = "text-xl",
  children,
}: ModalShellProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // True from opening until the closing animation finishes.
  const [visible, setVisible] = useState(open);
  if (open && !visible) setVisible(true);

  // The portal needs <body>, which does not exist during server rendering.
  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      // Reduced motion still runs a 1ms animation, so animationend always fires and the modal unmounts.
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 px-4 py-6 overflow-y-auto duration-200 fill-mode-forwards motion-reduce:[animation-duration:1ms] ${open ? "animate-in fade-in-0" : "animate-out fade-out-0"}`}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && !open) setVisible(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        className={`my-auto w-full ${maxWidth} bg-white rounded-lg shadow-2xl duration-200 ease-out fill-mode-forwards motion-reduce:[animation-duration:1ms] ${open ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2" : "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2"} ${panelClassName}`}
      >
        <div
          className={`relative bg-[#5b0610] ${headerPadding} rounded-t-lg shrink-0`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X size={18} />
          </button>
          <h2 id={headerId} className={`${titleSize} font-bold text-white pr-8`}>
            {title}
          </h2>
          {subtitle && <p className="text-xs text-white/80 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
