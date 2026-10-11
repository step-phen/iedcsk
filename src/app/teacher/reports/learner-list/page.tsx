import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import LearnerListReport, { type LearnerListRow } from "./_components/learner-list-report";

export const metadata: Metadata = {
  title: "IEDCSK | Class List",
  description: "Printable list of the teacher's learners, also downloadable as a PDF.",
};

export default async function LearnerListPage() {
  const me = await requireTeacher();

  // Essential data, so a failure reaches the error boundary instead of printing an empty list.
  const res = await serverApi("/api/learners");
  if (!res.ok) throw new Error(`GET /api/learners failed: ${res.status}`);
  const learners = (await res.json()) as LearnerListRow[];

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      <div className="relative overflow-hidden rounded-2xl bg-[#5b0610] p-5 md:p-6 shadow-lg shadow-[#5b0610]/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a05465] rounded-full blur-3xl opacity-20 mix-blend-screen" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-[#3d0208] rounded-full blur-3xl opacity-40 mix-blend-multiply" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white hidden sm:flex">
            <ClipboardList size={22} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#e3b8bc] tracking-[0.15em] uppercase mb-1">
              Report Center
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Class List
            </h1>
            <p className="text-xs md:text-[13px] text-white/80 mt-1 max-w-xl font-medium">
              Every learner in your class, ready to print or download as a PDF.
            </p>
          </div>
        </div>
      </div>

      <LearnerListReport learners={learners} teacherName={me.teacherName} />
    </div>
  );
}
