import type { Metadata } from "next";
import { FileText } from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { requireTeacher } from "@/lib/auth";
import ProgressReportSection from "./_components/progress-report-section";

interface ProgressReportPageProps {
  /** ?section= and ?learner= pick the learner in the active school year; ?quarter= picks the quarter. */
  searchParams: Promise<{ section?: string; learner?: string; quarter?: string }>;
}

export const metadata: Metadata = {
  title: "IEDCSK | Progress Report",
  description: "One learner's quarterly progress report, drafted from recorded results and finalized by the teacher.",
};

export default async function ProgressReportPage({ searchParams }: ProgressReportPageProps) {
  const { section, learner, quarter } = await searchParams;
  await requireTeacher();

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      {/* Hero header, same shape as the Print & Reports pages. */}
      <div className="relative overflow-hidden rounded-2xl bg-[#5b0610] p-5 md:p-6 shadow-lg shadow-[#5b0610]/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a05465] rounded-full blur-3xl opacity-20 mix-blend-screen" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-[#3d0208] rounded-full blur-3xl opacity-40 mix-blend-multiply" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white hidden sm:flex">
            <FileText size={22} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#e3b8bc] tracking-[0.15em] uppercase mb-1">
              Report Center
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Progress Report
            </h1>
            <p className="text-xs md:text-[13px] text-white/80 mt-1 max-w-xl font-medium">
              One learner&apos;s quarterly report, drafted from recorded results, ready to review, finalize and print.
            </p>
          </div>
        </div>
      </div>

      <ProgressReportSection section={section} learner={learner} quarter={quarter} />
    </div>
  );
}
