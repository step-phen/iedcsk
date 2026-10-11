import type { Metadata } from "next";
import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import ChecklistTable, { type SectionChecklist } from "./_components/checklist-table";
import type { Section } from "@/types/db";

export const metadata: Metadata = {
  title: "IEDCSK | Developmental Checklist",
  description:
    "Interactive Developmental Checklist for Kindergarten Learners at SPC",
};

export default async function DevelopmentalChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; quarter?: string }>;
}) {
  await requireTeacher();

  const sectionsRes = await serverApi("/api/sections");
  if (!sectionsRes.ok) throw new Error(`GET /api/sections failed: ${sectionsRes.status}`);
  const sections = (await sectionsRes.json()) as Section[];

  // ?section= picks the section; otherwise the first one.
  const { section, quarter } = await searchParams;
  const selected = sections.find((s) => String(s.sectionId) === section) ?? sections[0];

  let checklist: SectionChecklist | null = null;
  if (selected) {
    const res = await serverApi(`/api/sections/${selected.sectionId}/checklist`);
    if (!res.ok) throw new Error(`GET /api/sections/${selected.sectionId}/checklist failed: ${res.status}`);
    checklist = (await res.json()) as SectionChecklist;
  }

  const header = (
    <section>
      <h1 className="text-xl font-bold text-stone-900 tracking-tight">
        Developmental Checklist
      </h1>
      <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
        See how each learner in your section is doing in every area of growth, quarter by quarter.
      </p>
    </section>
  );

  return (
    <div className="space-y-3">
      <PageHeader className="mb-3" />

      {selected && checklist ? (
        // Keyed by section so the quarter and domain choices reset when the section changes.
        <ChecklistTable key={selected.sectionId} header={header} sections={sections} sectionId={selected.sectionId} data={checklist} initialQuarter={quarter} />
      ) : (
        <>
          {header}
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            You have no sections yet. Add one in Settings → Sections.
          </p>
        </>
      )}
    </div>
  );
}
