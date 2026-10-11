import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import { formatDatePH } from "@/lib/datetime";
import { serverApi } from "@/lib/server-api";
import ClassroomClient from "@/app/teacher/classroom/_components/classroom-client";
import type { Section } from "@/types/db";

export const metadata: Metadata = {
  title: "IEDCSK | Classroom",
  description: "Classroom page.",
};

export default async function ClassroomPage({
  searchParams,
}: {
  /** ?attendance=1 arrives from the dashboard's attendance card; ?section= picks the class. */
  searchParams: Promise<{ attendance?: string; section?: string }>;
}) {
  await requireTeacher();
  const { attendance, section } = await searchParams;

  // Same section rule as the dashboard: a stale or foreign ?section= falls back to the first section.
  const sections = await serverApi("/api/sections")
    .then(async (res) => (res.ok ? ((await res.json()) as Section[]) : []))
    .catch(() => []);
  const selectedSectionId = (sections.find((s) => String(s.sectionId) === section) ?? sections[0])?.sectionId ?? null;

  // Formatted on the server in PH time, so the header never shows the browser's date.
  const today = formatDatePH(new Date(), { weekday: "long", month: "short", day: "numeric" });

  return (
    <ClassroomClient
      today={today}
      sections={sections}
      sectionId={selectedSectionId}
      openAttendance={attendance === "1"}
    />
  );
}
