import type { Metadata } from "next";
import { Suspense } from "react";
import ModuleContent from "@/app/teacher/module/_components/module-content";
import { requireTeacher } from "@/lib/auth";

export const metadata: Metadata = {
  title: "IEDCSK | Modules",
  description: "Interactive Developmental Checklist for Kindergarten Learners at SPC",
};

// Lessons are placed by curriculum quarter number (1-4), not by a dated quarter row.
const QUARTERS = ["1st", "2nd", "3rd", "4th"].map((ordinal, i) => ({
  quarterId: i + 1,
  quarterNumber: i + 1,
  quarterName: `${ordinal} Quarter`,
  schoolYear: "",
}));

export default async function ModulesPage() {
  await requireTeacher();

  return (
    <Suspense>
      <ModuleContent quarters={QUARTERS} />
    </Suspense>
  );
}
