"use client";

import { useSections } from "@/hooks/useSections";

interface SectionSelectProps {
  /** Load the list only once the surrounding form is actually open. */
  enabled: boolean;
  /** The Grade Level field's current value — narrows the option list. */
  gradeLevel: string;
  error?: string;
  /** The form's shared input class helper, so this matches its siblings. */
  inputClassName: (error?: string) => string;
}

/**
 * The Section dropdown, backed by the `sections` table (Joy and/or Faith, set
 * up when the school year was activated). Submits the section name as plain
 * text — `enrollments.section` stays a free-text column, this just gives the
 * teacher a consistent list to pick from instead of retyping it each time.
 *
 * Falls back to a plain text box when the list fails to load, same as
 * ProvinceSelect — a learner still has to be addable without it.
 */
export default function SectionSelect({
  enabled,
  gradeLevel,
  error,
  inputClassName,
}: SectionSelectProps) {
  const { sections, loading, failed } = useSections(enabled);
  const options = sections.filter((s) => s.gradeLevel === gradeLevel);

  if (failed) {
    return (
      <>
        <input
          id="section"
          name="section"
          placeholder="e.g. Joy"
          aria-invalid={!!error}
          aria-describedby="section-error"
          className={inputClassName(error)}
        />
        <p id="section-error" className="text-xs text-red-500 mt-1">
          {error ?? "Could not load the section list. Reopen the form to retry."}
        </p>
      </>
    );
  }

  return (
    <>
      <select
        id="section"
        name="section"
        disabled={!gradeLevel || loading}
        aria-invalid={!!error}
        aria-describedby={error ? "section-error" : undefined}
        className={inputClassName(error)}
      >
        <option value="">
          {!gradeLevel
            ? "Select grade level first"
            : loading
              ? "Loading sections…"
              : options.length === 0
                ? "No sections for this school year"
                : "Select"}
        </option>
        {options.map((s) => (
          <option key={s.sectionId} value={s.sectionName}>
            {s.sectionName}
          </option>
        ))}
      </select>
      {error && <p id="section-error" className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}
