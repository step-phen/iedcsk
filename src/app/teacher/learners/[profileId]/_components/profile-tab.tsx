import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { formatDatePH } from "@/lib/datetime";
import { formatLearnerAddress, hasMiddleName } from "@/lib/learners";
import type { Guardian, LearnerAddress } from "@/types/db";

interface ProfileTabLearner {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  /** null when the learner has no suffix. */
  extensionName: string | null;
  birthdate: Date;
  gender: string;
  /** null when the learner has no photo uploaded yet. */
  photoUrl: string | null;
  /** The joined learner_addresses row — null when the learner has none. */
  address: LearnerAddress | null;
  /** From the learner's latest enrollment — null for a learner with none yet. */
  gradeLevel: string | null;
  section: string | null;
  /** Every guardian on file for this learner — a learner can have more than one. */
  guardians: Pick<Guardian, "guardianId" | "guardianName" | "contactNumber" | "relationshipToLearner" | "guardianEmail">[];
}

interface ProfileTabProps {
  learner: ProfileTabLearner;
  years: number;
  /** The Edit Profile button, shown at the top right of the Personal Information card. */
  editAction: ReactNode;
}

// Label above value — the value line just sits in the section's own flow, no per-field box.
function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      {/* "N/A" is a display placeholder only — an absent value is stored as
          NULL, never as this string (see add-learner-action.ts). */}
      <p className="text-sm font-semibold text-gray-900">{value || "N/A"}</p>
    </div>
  );
}

export default function ProfileTab({ learner, years, editAction }: ProfileTabProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Section: Personal Information */}
      <div className="p-5 flex-1">
        <div className="mb-6 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold uppercase tracking-wider text-[#4a0e1c] flex items-center gap-2">
            Personal Information
          </h2>
          {editAction}
        </div>

        <div className="rounded-xl bg-[#eae4c9]/25 border border-[#eae4c9] p-4 space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReadOnlyField label="Given Name" value={learner.firstName} />
            {/* Blank middle names are stored as the "N/A" sentinel — normalise
                it away so the field falls back to the same em dash every other
                empty field shows. */}
            <ReadOnlyField
              label="Middle Name"
              value={hasMiddleName(learner.middleName) ? learner.middleName : null}
            />
            <ReadOnlyField label="Family Name" value={learner.lastName} />
            <ReadOnlyField label="Suffix" value={learner.extensionName} />
          </div>

          <div className="border-t border-[#eae4c9]" />

          {/* Demographics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReadOnlyField
              label="Birthdate"
              value={formatDatePH(learner.birthdate, { month: "short", day: "numeric", year: "numeric" })}
            />
            <ReadOnlyField label="Gender" value={learner.gender} />
            <ReadOnlyField label="Age" value={`${years} years old`} />
          </div>

          <div className="border-t border-[#eae4c9]" />

          {/* Address — the five address columns are joined from
              learner_addresses and composed into one line by formatLearnerAddress. */}
          <ReadOnlyField label="Address" value={formatLearnerAddress(learner.address)} />
        </div>
      </div>

      <Separator className="bg-gray-500 mb-3" />

      {/* Section: Guardian & Contact — a learner can have more than one
          guardian on file, so this lists all of them, not just the first. */}
      <div className="p-5">
        <h2 className="text-[15px] font-bold uppercase tracking-wider text-[#4a0e1c] mb-6 flex items-center gap-2">
          Guardian & Contact Information
        </h2>
        <div className="rounded-xl bg-[#eae4c9]/25 border border-[#eae4c9] p-4 space-y-4">
          {learner.guardians.map((guardian, i) => (
            <div key={guardian.guardianId}>
              {learner.guardians.length > 1 && (
                <p className="text-xs font-bold text-gray-500 mb-2">Guardian {i + 1}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ReadOnlyField label="Guardian" value={guardian.guardianName} />
                <ReadOnlyField label="Contact No." value={guardian.contactNumber} />
                {/* The column already holds the real relationship — a teacher
                    who picked "Other" had their typed text stored in place of
                    the token. */}
                <ReadOnlyField label="Relationship" value={guardian.relationshipToLearner} />
                {/* Optional field — omitted entirely when not on file, unlike
                    the required fields above which always show their "N/A" box. */}
                {guardian.guardianEmail && <ReadOnlyField label="Email" value={guardian.guardianEmail} />}
              </div>
              {i < learner.guardians.length - 1 && <div className="border-t border-[#eae4c9] mt-4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
