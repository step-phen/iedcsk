import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LearnerListItem } from "@/types/learner";
import { calculateAge, displayName, getAvatarColor, getInitials } from "@/lib/learners";
import { cn } from "@/lib/utils";

/** The learner's photo, or their initials on their own color; shared by the card and the list row. */
// Eager: a class is a few dozen small photos at most, and the first ones are often the page's LCP.
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
        <Image src={learner.photoUrl} alt="" width={px} height={px} loading="eager" className="size-full object-cover" />
      ) : (
        getInitials(learner.firstName, learner.lastName)
      )}
    </span>
  );
}

/** The whole card opens the learner's profile. */
export default function LearnerCard({ learner }: { learner: LearnerListItem }) {
  const age = calculateAge(learner.birthdate);
  return (
    <Link
      href={`/teacher/learners/${learner.learnerId}`}
      className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm outline-none transition-[border-color,transform] duration-100 ease-out hover:border-sidebar/40 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-sidebar focus-visible:ring-offset-2"
    >
      <LearnerPhoto learner={learner} size="lg" />
      {/* Every detail wraps instead of clipping; the card grows to fit. */}
      <span className="min-w-0 flex-1 space-y-0.5 break-words">
        <span className="block text-base font-semibold leading-snug text-gray-900 group-hover:text-sidebar">{displayName(learner)}</span>
        <span className="block text-[11px] font-bold tracking-wide text-sidebar tabular-nums">LRN: {learner.lrn ?? "N/A"}</span>
        <span className="block text-xs text-gray-700">
          <span className="font-semibold text-gray-500">Section:</span>{" "}
          {learner.gradeLevel && learner.section ? `${learner.gradeLevel} - ${learner.section}` : "—"}
        </span>
        <span className="block text-xs text-gray-500">
          {learner.gender} • {age} {age === 1 ? "year" : "years"} old
        </span>
      </span>
      {/* Spelled out: a bare chevron doesn't tell every teacher the card opens the profile. */}
      <span className="flex shrink-0 items-center gap-0.5 self-center text-xs font-semibold text-gray-500 group-hover:text-sidebar">
        View Profile
        <ChevronRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
