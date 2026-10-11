import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LearnerListItem } from "@/types/learner";
import { calculateAge, displayName, getAvatarColor, getInitials } from "@/lib/learners";
import { cn } from "@/lib/utils";

/** The learner's photo, or their initials on their own color; shared by the card and the list row. */
export function LearnerPhoto({ learner, size }: { learner: LearnerListItem; size: "sm" | "lg" }) {
  const px = size === "lg" ? 56 : 36;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-semibold",
        size === "lg" ? "size-14 text-sm" : "size-9 text-xs",
        getAvatarColor(learner.learnerId),
      )}
    >
      {learner.photoUrl ? (
        <Image src={learner.photoUrl} alt="" width={px} height={px} className="size-full object-cover" />
      ) : (
        getInitials(learner.firstName, learner.lastName)
      )}
    </span>
  );
}

/** The whole card opens the learner's profile. */
export default function LearnerCard({ learner }: { learner: LearnerListItem }) {
  return (
    <Link
      href={`/teacher/learners/${learner.learnerId}`}
      className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm outline-none transition-[border-color,transform] duration-100 ease-out hover:border-sidebar/40 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
    >
      <LearnerPhoto learner={learner} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-gray-900 group-hover:text-sidebar">{displayName(learner)}</span>
        <span className="block text-[11px] font-bold tracking-wide text-sidebar tabular-nums">LRN: {learner.lrn ?? "—"}</span>
        <span className="block truncate text-xs text-gray-500">
          {learner.gradeLevel && learner.section && `${learner.gradeLevel} - ${learner.section} • `}
          {learner.gender}, {calculateAge(learner.birthdate)} yrs old
        </span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-gray-300 group-hover:text-sidebar" />
    </Link>
  );
}
