"use client";

import { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { Users, AlertCircle, UserPlus, type LucideIcon } from "lucide-react";
import type { LearnerListItem } from "@/types/learner";
import type { Gender } from "@/constants/enums";
import { calculateAge, matchesLearnerSearch } from "@/lib/learners";
import { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import Segmented from "@/app/teacher/_components/shared/segmented";
import Pagination from "@/app/teacher/_components/shared/pagination";
import LearnerCard from "./learner-card";
import LearnerTable from "./learner-table";
import LearnerSearch from "./learner-search";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import { PageLoader } from "@/components/ui/page-loader";

// Grade level and section together, since the same section name can exist in more than one grade.
const sectionKey = (l: LearnerListItem) => `${l.gradeLevel} - ${l.section}`;

// The teacher's List or Cards choice, kept for their next visit.
const VIEW_KEY = "learners-view";

type View = "list" | "cards";

// Divides evenly into the 1/2/3/4-column card grid.
const PAGE_SIZE = 24;

interface ClassListProps {
  learnersPromise: Promise<LearnerListItem[]>;
}

export default function ClassList({ learnersPromise }: ClassListProps) {
  return (
    <div className="flex-1 flex flex-col space-y-3">
      <PageHeader className="mb-3" />

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Learners &amp; Class List</h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">Every learner in your class. Click a name to open their profile.</p>
        </div>
        <Link
          href="/teacher/learners/add"
          className="group inline-flex w-fit items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-sidebar hover:bg-[#7e1422] rounded-lg shadow-md transition-[background-color,transform] duration-100 ease-out active:scale-[0.97] motion-reduce:active:scale-100 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sidebar/40"
        >
          <UserPlus size={16} className="text-amber-300" />
          Add Learners
        </Link>
      </section>

      {/* Only the roster waits on the data; the loading screen reuses this with a promise that never resolves. */}
      <Suspense fallback={<PageLoader />}>
        <Roster learnersPromise={learnersPromise} />
      </Suspense>
    </div>
  );
}

function Roster({ learnersPromise }: { learnersPromise: Promise<LearnerListItem[]> }) {
  const learners = use(learnersPromise);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "ALL">("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [ageFilter, setAgeFilter] = useState("ALL");
  const [view, setView] = useState<View>("list");
  // Held here, outside the per-view subtree, so List and Cards share one page.
  const [page, setPage] = useState(1);

  // Read after mount, so the server render and the first client render agree.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a remembered choice from browser storage
      if (localStorage.getItem(VIEW_KEY) === "cards") setView("cards");
    } catch {}
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  const sections = [...new Set(learners.map(sectionKey))].sort();
  const ages = [...new Set(learners.map((l) => calculateAge(l.birthdate)))].sort((a, b) => a - b);
  // Gender counts follow the search, section and age, so the numbers match what the teacher is looking at.
  const inScope = learners.filter(
    (l) =>
      matchesLearnerSearch(l, searchQuery) &&
      (sectionFilter === "ALL" || sectionKey(l) === sectionFilter) &&
      (ageFilter === "ALL" || calculateAge(l.birthdate) === Number(ageFilter)),
  );
  const shown = inScope.filter((l) => genderFilter === "ALL" || l.gender === genderFilter);
  const boys = inScope.filter((l) => l.gender === "Male").length;

  // Pagination runs on the filtered list. When it shrinks past the stored page (a learner gone
  // after a refresh), the stored page follows to the last valid one; the clamp keeps this render
  // from ever showing an empty page in between.
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  if (page > pageCount) setPage(pageCount);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageLearners = shown.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* A floating translucent bar that stays under the header while the roster scrolls beneath it. */}
      <div className="material-bar sticky top-[4.25rem] z-20 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 md:px-5">
        {/* Every filter change starts over at page 1. */}
        <LearnerSearch
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          Section
          <select
            name="section-filter"
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="ALL">All sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          Age
          <select
            name="age-filter"
            value={ageFilter}
            onChange={(e) => {
              setAgeFilter(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="ALL">All ages</option>
            {ages.map((age) => (
              <option key={age} value={age}>
                {age} years old
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="Show"
          options={[
            { value: "ALL", label: `All ${inScope.length}` },
            { value: "Male", label: `Boys ${boys}` },
            { value: "Female", label: `Girls ${inScope.length - boys}` },
          ]}
          value={genderFilter}
          onChange={(v) => {
            setGenderFilter(v as Gender | "ALL");
            setPage(1);
          }}
        />
        <div className="ml-auto">
          <Segmented
            label="View"
            options={[
              { value: "list", label: "List" },
              { value: "cards", label: "Cards" },
            ]}
            value={view}
            onChange={(v) => changeView(v as View)}
          />
        </div>
      </div>

      {/* overflow-clip rounds the corners without becoming a scroll box, so the footer can stick
          to the bottom of the page's scroll area while the roster scrolls past it. */}
      <div className="flex flex-1 flex-col overflow-clip rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Keyed by view, so switching List and Cards cross-fades instead of jumping. */}
        <div key={view} className="flex-1 animate-in fade-in duration-200 motion-reduce:animate-none">
          {learners.length === 0 ? (
            <EmptyState icon={Users} title="No Learners Yet" message="Add your first learner to get started." />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              tone="amber"
              title="No matches found"
              message={
                searchQuery ? (
                  <>
                    No learner named <strong className="text-gray-700">&quot;{searchQuery}&quot;</strong>.
                  </>
                ) : (
                  "No learners match the selected filters."
                )
              }
            />
          ) : view === "list" ? (
            <LearnerTable learners={pageLearners} startIndex={start} />
          ) : (
            // Columns follow the roster's own width, not the viewport, so the sidebar (expanded or
            // collapsed) is accounted for; each step keeps cards at least ~19rem wide.
            <div className="@container bg-gray-50/60 p-4">
              <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4">
                {pageLearners.map((learner) => (
                  <LearnerCard key={learner.learnerId} learner={learner} />
                ))}
              </div>
            </div>
          )}
        </div>
        <Pagination
          start={start}
          shownOnPage={pageLearners.length}
          total={shown.length}
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  tone = "maroon",
  title,
  message,
}: {
  icon: LucideIcon;
  tone?: "maroon" | "amber";
  title: string;
  message: React.ReactNode;
}) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-[#5b0610]/10 text-[#5b0610]";

  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${toneClass}`}>
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm">{message}</p>
    </div>
  );
}
