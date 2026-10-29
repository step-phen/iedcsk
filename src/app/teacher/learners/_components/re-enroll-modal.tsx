"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { AlertTriangle, ArrowLeft, Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { calculateAge, displayName, gradeLevels } from "@/lib/learners";
import { ModalShell } from "@/components/ui/modal-shell";
import SectionSelect from "@/components/learner/section-select";
import { invalidateSections } from "@/hooks/useSections";
import { displaySchoolYear, useActiveSchoolYear } from "@/hooks/useActiveSchoolYear";

/** A learner this teacher taught in an earlier year (GET /api/learners/re-enrollable). */
interface Candidate {
  learnerId: number;
  lrn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  birthdate: string;
  /** Section of the learner's latest enrollment, with its school year and status below. */
  section: string | null;
  lastSchoolYear: string | null;
  lastStatus: string | null;
  /** Why the API would refuse this learner; null when they can be re-enrolled. */
  blockedReason: string | null;
}

const MIN_QUERY = 2;
const GRADE_LEVEL = gradeLevels[0];
const STATUS_LABELS: Record<string, string> = {
  active: "Enrolled",
  completed: "Completed",
  withdrawn: "Withdrawn",
  transferred: "Transferred",
};

const field = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white ${err ? "border-red-400" : "border-gray-300"}`;
const label = "text-xs font-bold uppercase tracking-wider text-[#4a0e1c]";

// The parent changes `key` each time it opens, so the search always starts empty.
export default function ReEnrollModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Candidate | null>(null);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Re-enroll Learner"
      subtitle="Bring back a learner you taught in an earlier school year, on their existing profile."
      headerId="re-enroll-title"
      maxWidth="max-w-lg"
    >
      {picked ? (
        <Confirm learner={picked} onBack={() => setPicked(null)} onDone={onClose} />
      ) : (
        <LearnerSearch query={query} setQuery={setQuery} onPick={setPicked} />
      )}
    </ModalShell>
  );
}

function LearnerSearch({
  query,
  setQuery,
  onPick,
}: {
  query: string;
  setQuery: (q: string) => void;
  onPick: (learner: Candidate) => void;
}) {
  const q = query.trim();
  // Each result remembers the query it answers, so loading is simply "no answer for this query yet".
  const [result, setResult] = useState<{ q: string; rows: Candidate[] | null } | null>(null);

  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    let cancelled = false;
    // Waits for a pause in typing, so each keystroke doesn't fire a request.
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/learners/re-enrollable?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`GET /api/learners/re-enrollable failed: ${res.status}`);
        const rows = (await res.json()) as Candidate[];
        if (!cancelled) setResult({ q, rows });
      } catch (err) {
        console.error("Failed to search past learners:", err);
        if (!cancelled) setResult({ q, rows: null });
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  const current = result?.q === q ? result : null;

  return (
    <div className="space-y-3 p-5">
      <div className="space-y-1.5">
        <label htmlFor="re-enroll-search" className={label}>
          Name or LRN
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id="re-enroll-search"
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="e.g. Dela Cruz or 123456789012"
            className={`${field()} pl-9`}
          />
        </div>
      </div>

      <div aria-live="polite" className="min-h-24">
        {q.length < MIN_QUERY ? (
          <p className="py-6 text-center text-xs text-gray-500">Type at least {MIN_QUERY} letters or digits to search.</p>
        ) : !current ? (
          <p className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </p>
        ) : current.rows === null ? (
          <p className="py-6 text-center text-xs text-red-600">Couldn&apos;t search right now. Please try again.</p>
        ) : current.rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-500">
            No past learner of yours matches <strong className="text-gray-700">&quot;{q}&quot;</strong>. Learners already enrolled this
            school year are on your class list.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
            {current.rows.map((l) => (
              <li key={l.learnerId}>
                <button
                  type="button"
                  disabled={!!l.blockedReason}
                  onClick={() => onPick(l)}
                  className="w-full px-4 py-3 text-left hover:bg-[#eae4c9]/40 focus-visible:bg-[#eae4c9]/40 outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-50 disabled:hover:bg-gray-50"
                >
                  <span className={`block text-sm font-semibold ${l.blockedReason ? "text-gray-500" : "text-gray-900"}`}>{displayName(l)}</span>
                  <span className="block text-xs text-gray-500">
                    {[l.lrn ? `LRN ${l.lrn}` : "No LRN", `${calculateAge(l.birthdate)} yrs old`].join(" · ")}
                  </span>
                  <span className="block text-xs text-gray-500">
                    Last:{" "}
                    {[
                      l.lastSchoolYear && displaySchoolYear(l.lastSchoolYear),
                      l.section,
                      l.lastStatus && (STATUS_LABELS[l.lastStatus] ?? l.lastStatus),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {l.blockedReason && (
                    <span className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {l.blockedReason}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Confirm({ learner, onBack, onDone }: { learner: Candidate; onBack: () => void; onDone: () => void }) {
  const router = useRouter();
  const year = useActiveSchoolYear();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const name = displayName(learner);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/learners/${learner.learnerId}/enrollments`, { method: "POST", body: new FormData(e.currentTarget) });
      if (res.ok) {
        toast.success(`${name} is re-enrolled for ${year ? displaySchoolYear(year.name) : "this school year"}.`);
        invalidateSections();
        onDone();
        router.refresh();
        return;
      }
      if (res.status === 422) {
        const { errors: found } = (await res.json()) as { errors: Record<string, string[]> };
        setErrors(Object.fromEntries(Object.entries(found).map(([key, messages]) => [key, messages[0]])));
      } else if (res.status === 404) {
        setErrors({ learner: "This learner is no longer on your past class lists." });
      } else {
        toast.error("Couldn't re-enroll the learner. Please try again.");
      }
    } catch (err) {
      console.error("Failed to re-enroll the learner:", err);
      toast.error("Couldn't re-enroll the learner. Please try again.");
    }
    setSaving(false);
  }

  const yearError = errors.schoolYear ?? errors.gradeLevel;

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-bold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">
          {[learner.lrn ? `LRN ${learner.lrn}` : "No LRN", `${calculateAge(learner.birthdate)} yrs old`].join(" · ")}
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Their existing profile is reused. Records from{" "}
          {learner.lastSchoolYear ? displaySchoolYear(learner.lastSchoolYear) : "earlier years"} stay with that year, and this school year
          starts with no attendance or assessments.
        </p>
      </div>

      {errors.learner && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {errors.learner}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className={label}>School Year</span>
          <p className={`${field(yearError)} bg-gray-100 text-gray-600`}>
            {year ? displaySchoolYear(year.name) : year === null ? "No active school year" : "Loading…"}
          </p>
          {year && <input type="hidden" name="schoolYear" value={year.name} />}
        </div>
        <div className="space-y-1.5">
          <span className={label}>Grade Level</span>
          <p className={`${field()} bg-gray-100 text-gray-600`}>{GRADE_LEVEL}</p>
          <input type="hidden" name="gradeLevel" value={GRADE_LEVEL} />
        </div>
      </div>
      {yearError && <p className="text-xs text-red-600">{yearError}</p>}

      <div className="space-y-1.5">
        <label htmlFor="section" className={label}>
          Section
        </label>
        {/* Remounts when the active year changes, so it never lists the previous year's sections. */}
        <SectionSelect key={year?.schoolYearId ?? "none"} enabled={true} gradeLevel={GRADE_LEVEL} error={errors.section} inputClassName={field} />
      </div>

      <div className="flex justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="submit"
          disabled={saving || !year}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d050d] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Re-enrolling…" : "Confirm Re-enrollment"}
        </button>
      </div>
    </form>
  );
}
