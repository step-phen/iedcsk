import type { Metadata } from "next";

import { requireTeacher } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import ClassList from "@/app/teacher/learners/_components/class-list";
import type { LearnerListItem } from "@/types/learner";

export const metadata: Metadata = {
  title: "IEDCSK | Learners",
  description: "Interactive Developmental Checklist for Kindergarten Learners at SPC",
};

type LearnerRow = Omit<
  LearnerListItem,
  "birthdate" | "participantStatus" | "missingActivities" | "completedActivities" | "activePracticalActivity"
> & { birthdate: string };

export default async function LearnersPage() {
  await requireTeacher();

  // Essential data, so a failure reaches the error boundary instead of showing an empty list.
  const res = await serverApi("/api/learners");
  if (!res.ok) throw new Error(`GET /api/learners failed: ${res.status}`);
  const rows = (await res.json()) as LearnerRow[];

  // ponytail: session, attendance, and activity fields stay empty until the classroom endpoints exist in Laravel.
  const learners = rows.map(
    (l): LearnerListItem => ({
      ...l,
      birthdate: new Date(`${l.birthdate}T00:00:00.000Z`),
      participantStatus: null,
      missingActivities: [],
      completedActivities: [],
      activePracticalActivity: null,
    }),
  );

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <ClassList learnersPromise={Promise.resolve(learners)} />
    </div>
  );
}
