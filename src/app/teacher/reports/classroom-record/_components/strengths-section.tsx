import { serverApi } from "@/lib/server-api";
import type { Section } from "@/types/db";
import StrengthsReport, { type StrengthsData } from "./strengths-report";

/** Fetches the Strengths & Weaknesses report for the URL's section and quarter; the client part filters and shows it. */
export default async function StrengthsSection({ section, quarter, teacherName }: { section?: string; quarter?: string; teacherName: string | null }) {
  // Same section rule as the Class Scores tab: a stale or foreign ?section= falls back to the first section.
  const sections = await serverApi("/api/sections")
    .then(async (res) => (res.ok ? ((await res.json()) as Section[]) : []))
    .catch(() => []);
  const sectionId = (sections.find((s) => String(s.sectionId) === section) ?? sections[0])?.sectionId ?? null;

  const report =
    sectionId === null
      ? null
      : await serverApi(`/api/sections/${sectionId}/classroom-record/strengths${quarter ? `?quarter=${encodeURIComponent(quarter)}` : ""}`)
          .then(async (res) => (res.ok ? ((await res.json()) as StrengthsData) : null))
          .catch(() => null);

  return <StrengthsReport sections={sections} sectionId={sectionId} report={report} teacherName={teacherName} />;
}
