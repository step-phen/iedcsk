import type { Metadata } from "next";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { requireTeacher } from "@/lib/auth";
import ReportTabs, { type ReportTab } from "./_components/report-tabs";
import EmptyReportSection from "./_components/empty-report-section";
import ClassScoresSection from "./_components/class-scores-section";

interface ClassroomRecordPageProps {
  /** ?section=, ?module= and ?quarter= pick what the Class Scores table shows. */
  searchParams: Promise<{ tab?: string; section?: string; module?: string; domain?: string; quarter?: string }>;
}

const BASE = "/teacher/reports/classroom-record";

const HREFS: Record<ReportTab, string> = {
  record: BASE,
  strengths: `${BASE}?tab=strengths`,
  developing: `${BASE}?tab=developing`,
};

const METADATA: Record<ReportTab, Metadata> = {
  record: {
    title: "IEDCSK | Classroom Record",
    description: "Every learner's activity results by module and quarter.",
  },
  strengths: {
    title: "IEDCSK | Strengths & Weaknesses",
    description: "Per-learner Mastery Index across every curriculum module, relative to each learner's own average.",
  },
  developing: {
    title: "IEDCSK | Developing Learners",
    description: "Progress reports for learners needing further assistance.",
  },
};

function toTab(tab: string | undefined): ReportTab {
  return tab === "strengths" || tab === "developing" ? tab : "record";
}

export async function generateMetadata({ searchParams }: ClassroomRecordPageProps): Promise<Metadata> {
  return METADATA[toTab((await searchParams).tab)];
}

export default async function ClassroomRecordPage({ searchParams }: ClassroomRecordPageProps) {
  const { tab, section, module, domain, quarter } = await searchParams;
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
          <EmptyReportSection
            title="How Each Learner Is Doing by Subject"
            heading="No strengths to show yet"
            message="Each learner's strengths appear here once they complete activities."
          />
        ) : activeTab === "developing" ? (
          <EmptyReportSection
            title="Learners Needing Further Assistance"
            heading="No developing learners yet"
            message="Learners who need more support appear here once they complete activities."
          />
        ) : (
          <ClassScoresSection section={section} module={module} domain={domain} quarter={quarter} teacherName={me.teacherName} />
        )}
      </ReportTabs>
    </div>
  );
}
