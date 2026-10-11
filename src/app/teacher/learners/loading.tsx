"use client";

import ClassList from "@/app/teacher/learners/_components/class-list";
import type { LearnerListItem } from "@/types/learner";

// Never resolves, so only the roster shows its loader while the page loads.
const pending = new Promise<LearnerListItem[]>(() => {});

export default function LearnersLoading() {
  return (
    <div className="flex-1 flex flex-col space-y-6">
      <ClassList learnersPromise={pending} />
    </div>
  );
}
