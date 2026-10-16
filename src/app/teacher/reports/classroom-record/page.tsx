import type { Metadata } from "next";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { requireTeacher } from "@/lib/auth";
import ReportTabs, { type ReportTab } from "./_components/report-tabs";
import ClassScoresSection from "./_components/class-scores-section";
import StrengthsSection from "./_components/strengths-section";

interface ClassroomRecordPageProps {
  /** ?section=, ?module=, ?quarter=, ?view= and ?week= pick what the Class Scores table shows. */
  searchParams: Promise<{ tab?: string; section?: string; module?: string; domain?: string; quarter?: string; view?: string; week?: string }>;
}

const BASE = "/teacher/reports/classroom-record";

const HREFS: Record<ReportTab, string> = {
  record: BASE,
  strengths: `${BASE}?tab=strengths`,
};

const METADATA: Record<ReportTab, Metadata> = {
  record: {
    title: "IEDCSK | Classroom Record",
    description: "Every learner's activity results by module and quarter.",
  },
  strengths: {
    title: "IEDCSK | Strengths & Weaknesses",
    description: "Each learner's strengths, areas needing support, and areas not yet assessed, with the evidence behind each.",
  },
};

function toTab(tab: string | undefined): ReportTab {
  return tab === "strengths" ? tab : "record";
}

export async function generateMetadata({ searchParams }: ClassroomRecordPageProps): Promise<Metadata> {
  return METADATA[toTab((await searchParams).tab)];
}

export default async function ClassroomRecordPage({ searchParams }: ClassroomRecordPageProps) {
  const { tab, section, module, domain, quarter, view, week } = await searchParams;
  const activeTab = toTab(tab);
  const me = await requireTeacher();

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      {/* Plain title row like the Learners page, so the table sits higher on the screen. */}
      <section>
        <h1 className="text-xl font-bold text-stone-900 tracking-tight">Classroom Record</h1>
        <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
          How each learner did on this module&apos;s activities, by quarter.
        </p>
      </section>

      <ReportTabs active={activeTab} hrefs={HREFS}>
        {activeTab === "strengths" ? (
          <StrengthsSection section={section} quarter={quarter} />
        ) : (
          <ClassScoresSection
            section={section}
            module={module}
            domain={domain}
            quarter={quarter}
            view={view}
            week={week}
            teacherName={me.teacherName}
          />
        )}
      </ReportTabs>
    </div>
  );
}
