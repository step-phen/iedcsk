import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import LearnerListReport, { type LearnerListRow } from "../learner-list/_components/learner-list-report";

export const metadata: Metadata = {
  title: "IEDCSK | Ready for Kinder 2",
  description: "Progress reports for learners meeting standard criteria.",
};

export default async function QualifiedLearnersPage() {
  const me = await requireTeacher();

  const res = await serverApi("/api/learners?ready=1");
  if (!res.ok) throw new Error(`GET /api/learners?ready=1 failed: ${res.status}`);
  const learners = (await res.json()) as LearnerListRow[];

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#5b0610] p-5 md:p-6 shadow-lg shadow-[#5b0610]/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a05465] rounded-full blur-3xl opacity-20 mix-blend-screen" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-[#3d0208] rounded-full blur-3xl opacity-40 mix-blend-multiply" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white hidden sm:flex">
            <BadgeCheck size={22} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#e3b8bc] tracking-[0.15em] uppercase mb-1">
              Report Center
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Ready for Kinder 2
            </h1>
            <p className="text-xs md:text-[13px] text-white/80 mt-1 max-w-xl font-medium">
              Learners meeting the standard criteria across all developmental
              domains.
            </p>
          </div>
        </div>
      </div>

      {/* Ready means every Q1 to Q4 checklist skill is rated achieved or developing. */}
      <LearnerListReport
        learners={learners}
        teacherName={me.teacherName}
        reportTitle="Learners Ready for Kinder 2"
        emptyHeading="No learners ready yet"
        emptyMessage="Learners appear here once every skill from the 1st to the 4th quarter is rated Achieved or Developing."
        status="Promoted"
      />
    </div>
  );
}
