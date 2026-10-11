import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared shell for the teacher dashboard's info cards (schedule, attendance,
 * at-risk learners): white body, maroon header bar, optional header pills.
 * Extracted from three near-identical implementations — keep new dashboard
 * cards on this instead of re-typing the header bar's classes.
 */
export function DashboardCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * `icon` is a full element, not a component + fixed color, so a card can
 * recolor it per state (e.g. AtRiskLearnersCard's emerald "all clear" icon).
 */
export function DashboardCardHeader({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-3 bg-sidebar flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}

/** The small white/10 uppercase badge used in dashboard card headers. */
export function DashboardCardPill({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold text-white/80 uppercase tracking-wider bg-white/10 px-2 py-1 rounded-md border border-white/20 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Padded, scrollable body. Pass `className="p-0"` for edge-to-edge content like a table. */
export function DashboardCardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)}>
      {children}
    </div>
  );
}
