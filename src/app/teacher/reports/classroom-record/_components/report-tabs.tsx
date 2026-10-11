"use client";

import { useRouter } from "next/navigation";
import { Table2, Sparkles, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Kept byte-identical to the Modules page's quarter-tab triggers. */
const TRIGGER_CLASS =
  "flex items-center gap-2 px-3 py-1.5 text-sm font-bold whitespace-nowrap text-gray-800 data-active:text-sidebar after:bg-sidebar";

export type ReportTab = "record" | "strengths" | "developing";

const TABS = [
  { value: "record", label: "Classroom Record", icon: Table2 },
  { value: "strengths", label: "Strengths & Weaknesses", icon: Sparkles },
  { value: "developing", label: "Developing Learners", icon: TrendingUp },
] as const;

/**
 * Tab bar for the class-wide reports. Same component and trigger styling as
 * the Modules page's quarter tabs — deliberately not a second tab design.
 *
 * The tab lives in the URL rather than in state so each section's own
 * searchParams survive a switch, and so only the visible section's queries run.
 */
export default function ReportTabs({
  active,
  hrefs,
  children,
}: {
  active: ReportTab;
  hrefs: Record<ReportTab, string>;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Tabs value={active} onValueChange={(value) => router.push(hrefs[value as ReportTab])}>
      <TabsList variant="line" className="mb-2 overflow-hidden shrink-0">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className={TRIGGER_CLASS}>
            <Icon size={14} />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {children}
    </Tabs>
  );
}
