import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LearnerListItem } from "@/types/learner";
import { calculateAge, displayName } from "@/lib/learners";
import { LearnerPhoto } from "./learner-card";

/**
 * One row per learner; the name link stretches over its row, so a click anywhere opens the profile.
 * `startIndex` is how many learners came before this page, so row numbers run on across pages.
 */
export default function LearnerTable({ learners, startIndex }: { learners: LearnerListItem[]; startIndex: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <th scope="col" className="w-12 px-4 py-2.5 text-center">#</th>
            <th scope="col" className="px-3 py-2.5">Learner</th>
            <th scope="col" className="px-3 py-2.5">LRN</th>
            <th scope="col" className="px-3 py-2.5">Section</th>
            <th scope="col" className="px-3 py-2.5 text-center">Sex</th>
            <th scope="col" className="px-3 py-2.5 text-center">Age</th>
            <th scope="col" className="px-3 py-2.5"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {learners.map((learner, i) => (
            <tr key={learner.learnerId} className="group relative transition-colors duration-100 hover:bg-sidebar/[0.04] active:bg-sidebar/[0.09]">
              <td className="px-4 py-2 text-center text-gray-500 tabular-nums">{startIndex + i + 1}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-3">
                  <LearnerPhoto learner={learner} size="sm" />
                  <Link
                    href={`/teacher/learners/${learner.learnerId}`}
                    className="font-semibold text-gray-900 outline-none after:absolute after:inset-0 group-hover:text-sidebar focus-visible:underline"
                  >
                    {displayName(learner)}
                  </Link>
                </span>
              </td>
              <td className="px-3 py-2 text-gray-700 tabular-nums">{learner.lrn ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                {learner.gradeLevel && learner.section ? `${learner.gradeLevel} - ${learner.section}` : "—"}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">{learner.gender === "Male" ? "M" : "F"}</td>
              <td className="px-3 py-2 text-center text-gray-700 tabular-nums">{calculateAge(learner.birthdate)}</td>
              {/* Same "Profile" cue as the card view; the stretched name link does the navigating. */}
              <td aria-hidden="true" className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-gray-500 group-hover:text-sidebar">
                <span className="flex items-center justify-end gap-0.5">
                  Profile
                  <ChevronRight size={16} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
