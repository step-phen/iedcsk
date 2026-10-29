import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, GraduationCap, UserRound, Users } from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { serverApi } from "@/lib/server-api";
import LearnerListReport, { type LearnerListRow } from "../../learner-list/_components/learner-list-report";
import { formatDatePH, formatEndDate } from "@/lib/datetime";
import type { PromotionYear } from "../_components/promotion-history";

export const metadata: Metadata = {
  title: "IEDCSK | Promotion Details",
  description: "Learners promoted to Grade 1 in one school year.",
};

const PAGE_SIZE = 10;

/** GET /api/promotions/{id}: the year's summary plus every promoted learner, sorted by name. */
type PromotionDetail = Omit<PromotionYear, "promotedCount"> & { learners: LearnerListRow[] };

export default async function PromotionDetailsPage({ params }: { params: Promise<{ schoolYearId: string }> }) {
  const { schoolYearId } = await params;
  if (!/^\d+$/.test(schoolYearId)) notFound();

  // 404 covers a year that isn't completed or held none of this teacher's sections.
  const res = await serverApi(`/api/promotions/${schoolYearId}`);
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`GET /api/promotions/${schoolYearId} failed: ${res.status}`);
  const year = (await res.json()) as PromotionDetail;
  // displaySchoolYear lives in a client module, so the label is built here.
  const label = `SY ${year.name.replace("-", "–")}`;

  const cards = [
    { icon: GraduationCap, label: "School Year", value: label },
    { icon: Users, label: "Total Promoted", value: String(year.learners.length) },
    // No promotion date is stored; the year's end date is the closest real record.
    { icon: CalendarCheck, label: "School Year Ended", value: formatEndDate(year.endDate) },
    { icon: UserRound, label: "Adviser", value: year.adviser },
  ];

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      <div className="relative overflow-hidden rounded-2xl bg-[#5b0610] p-5 md:p-6 shadow-lg shadow-[#5b0610]/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a05465] rounded-full blur-3xl opacity-20 mix-blend-screen" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-[#3d0208] rounded-full blur-3xl opacity-40 mix-blend-multiply" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white hidden sm:flex">
              <GraduationCap size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#e3b8bc] tracking-[0.15em] uppercase mb-1">Promotion History</p>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Promotion Details</h1>
              <p className="text-xs md:text-[13px] text-white/80 mt-1 max-w-xl font-medium">
                {label} · Learners promoted to Grade 1
              </p>
            </div>
          </div>
          <Link
            href="/teacher/reports/promoted-learners"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white border border-white/30 bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.4} />
            Back to Promotion History
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label: name, value }) => (
          <div key={name} className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm shadow-gray-200/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5b0610]/8 text-[#5b0610]">
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-[12px] font-semibold text-gray-600">{name}</dt>
              <dd className="truncate text-[15px] font-bold text-gray-900 tabular-nums">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Promoted means every Q1 to Q4 checklist skill of that year was rated HA or A. */}
      <LearnerListReport
        learners={year.learners}
        teacherName={year.adviser}
        reportTitle={`Learners Promoted to Grade 1 ${label}`}
        emptyHeading="No learners promoted this school year"
        emptyMessage="Learners appear here when every skill from the 1st to the 4th quarter of that year was rated HA (Highly accomplished) or A (Accomplished)."
        status="Promoted"
        pageSize={PAGE_SIZE}
        dateLine={`School Year Ended: ${year.endDate ? formatDatePH(new Date(`${year.endDate}T00:00:00Z`)) : "—"}`}
      />
    </div>
  );
}
