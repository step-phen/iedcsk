import { UserX } from "lucide-react";
import BackLink from "./_components/back-link";

/**
 * Rendered by the notFound() calls in this route's page.tsx — both for a
 * malformed id and for a learner that isn't this teacher's.
 *
 * The wording deliberately does not distinguish those two cases: the page
 * scopes its query by teacherId, so another teacher's learner is meant to be
 * indistinguishable from one that doesn't exist.
 */
export default function LearnerNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <UserX size={24} />
        </div>

        <h1 className="text-lg font-bold text-gray-900">Learner not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This learner doesn&apos;t exist, or isn&apos;t in your class.
        </p>

        <div className="mt-6">
          <BackLink />
        </div>
      </div>
    </div>
  );
}
