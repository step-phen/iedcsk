"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Eye, Lock, RefreshCw, Save, Sparkles, Unlock } from "lucide-react";
import { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import Segmented from "@/app/teacher/_components/shared/segmented";
import { ModalShell } from "@/components/ui/modal-shell";
import { PRACTICAL_RESULT_LABEL, type PracticalResultValue } from "@/constants/enums";
import { apiFetch } from "@/lib/api";
import { formatDatePH } from "@/lib/datetime";
import { capitalizeWords } from "@/lib/learners";
import { cn } from "@/lib/utils";
import type { Section } from "@/types/db";
import { downloadProgressReport, printedRows, reportLearnerName, type ReportHeader, type ReportRow } from "./progress-report-pdf";

/** One checklist skill and everything recorded for it, as captured when the draft was generated. */
interface Evidence {
  itemId: number;
  item: string;
  activityId: number | null;
  activityName: string | null;
  format: "digital" | "practical" | null;
  level: "strength" | "developing" | "needs" | null;
  source: "checklist" | "practical" | "digital" | null;
  status: "assessed" | "awaiting_rating" | "not_assessed";
  checklist: { rating: keyof typeof CHECKLIST_LABEL; remarks: string | null } | null;
  result: { score: number | null; maxScore: number | null; rating: PracticalResultValue | null; remarks: string | null; playedQuarter: number } | null;
}

type EditorRow = ReportRow & { generatedObserved: string | null; evidence: Evidence[] };

/** GET /api/progress-reports/{id} */
export interface Report {
  reportId: number;
  status: "draft" | "finalized";
  updatedAt: string;
  correctionReason: string | null;
  header: ReportHeader;
  rows: EditorRow[];
  unplaced: Evidence[];
  versions: { version: number; finalizedAt: string; finalizedBy: string; correctionReason: string | null }[];
}

/** GET /api/sections/{id}/progress-reports */
export interface Roster {
  quarter: number;
  quarters: { quarter: number; quarterName: string; available: boolean }[];
  learners: {
    enrollmentId: number;
    learnerId: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    extensionName: string | null;
    enrollmentStatus: string;
    reportId: number | null;
    reportStatus: "draft" | "finalized" | null;
  }[];
}

/** GET /api/progress-reports/{id}/versions/{n} */
interface Snapshot {
  version: number;
  header: ReportHeader;
  rows: ReportRow[];
  finalizedAt: string;
  correctionReason: string | null;
}

type Printable = { header: ReportHeader; rows: ReportRow[]; status: string; version?: number };

const CHECKLIST_LABEL = { achieved: "Achieved", developing: "Developing", needs_support: "Needs support", not_yet_observed: "Not yet observed" };

const LEVEL = {
  strength: { label: "Strength", className: "bg-emerald-50 text-emerald-700" },
  developing: { label: "Developing", className: "bg-amber-50 text-amber-700" },
  needs: { label: "Needs practice", className: "bg-rose-50 text-rose-700" },
};

const CHIP = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";
const ACTION =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar/30 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY = cn(ACTION, "border-sidebar/20 bg-white text-sidebar hover:bg-sidebar/5");
const PRIMARY = cn(ACTION, "border-sidebar bg-sidebar text-white hover:bg-sidebar/90");
const TEXTAREA =
  "w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-sidebar focus:outline-none focus:ring-2 focus:ring-sidebar/20 read-only:bg-stone-50";

async function errorOf(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
  return Object.values(body?.errors ?? {})[0]?.[0] ?? body?.message ?? fallback;
}

// Postgres sends "2026-10-14 02:00:00+00"; make it ISO so every browser parses it.
const dateOf = (value: string) => formatDatePH(new Date(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")));

// PDF footer and preview subtitle for a finalized version.
const versionLabel = (v: { version: number; finalizedAt: string; correctionReason: string | null }) =>
  `Version ${v.version}${v.correctionReason ? `, corrected ${dateOf(v.finalizedAt)}` : ""}`;

const sortName = (l: Roster["learners"][number]) => capitalizeWords(`${l.lastName}, ${l.firstName}`);

/** Filters plus the selected learner's report: generate, edit, finalize, correct, preview and download. */
export default function ProgressReportEditor({
  yearName,
  sections,
  sectionId,
  roster,
  learnerId,
  report,
}: {
  yearName: string | null;
  sections: Section[];
  sectionId: number | null;
  roster: Roster | null;
  learnerId: number | null;
  report: Report | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const learner = roster?.learners.find((l) => l.learnerId === learnerId) ?? null;
  const quarter = roster?.quarters.find((q) => q.quarter === roster.quarter);

  const go = (next: { section?: number | null; learner?: number | null; quarter?: number }) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving them?")) return;
    const values = { section: sectionId, learner: learnerId, quarter: roster?.quarter, ...next };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value != null) params.set(key, String(value));
    startTransition(() => router.push(`/teacher/reports/progress-report?${params}`, { scroll: false }));
  };
  const refresh = () => startTransition(() => router.refresh());

  const generate = async () => {
    if (!learner || !sectionId || !roster) return;
    const res = await apiFetch(`/api/sections/${sectionId}/progress-reports`, {
      method: "POST",
      body: JSON.stringify({ enrollmentId: learner.enrollmentId, quarter: roster.quarter }),
    });
    if (!res.ok) return void toast.error(await errorOf(res, "Could not generate the report. Please try again."));
    toast.success("Draft generated. Review it before finalizing.");
    refresh();
  };

  return (
    <div className="flex flex-col gap-3" data-pending={pending ? "" : undefined}>
      <div className="material-bar sticky top-[4.25rem] z-20 flex flex-wrap items-center gap-4 rounded-xl px-5 py-3">
        <p className="flex items-center gap-2 text-xs font-bold text-gray-700">
          School Year
          <span className="text-sm text-gray-900">{yearName ?? "None active"}</span>
        </p>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          Section
          <select
            value={sectionId ?? ""}
            onChange={(e) => go({ section: Number(e.target.value), learner: null })}
            disabled={sections.length === 0}
            className={SELECT_CLASS}
          >
            {sections.length === 0 && <option>No sections</option>}
            {sections.map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                {s.gradeLevel} - {s.sectionName}
              </option>
            ))}
          </select>
        </label>
        {roster && (
          <>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
              Learner
              <select
                value={learnerId ?? ""}
                onChange={(e) => go({ learner: Number(e.target.value) })}
                disabled={roster.learners.length === 0}
                className={cn(SELECT_CLASS, "max-w-64")}
              >
                <option value="" disabled>
                  {roster.learners.length === 0 ? "No learners" : "Pick a learner"}
                </option>
                {roster.learners.map((l) => (
                  <option key={l.learnerId} value={l.learnerId}>
                    {sortName(l)}
                    {l.reportStatus === "finalized" ? " — Finalized" : l.reportStatus === "draft" ? " — Draft" : ""}
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              label="Quarter"
              options={roster.quarters.map((q) => ({ value: String(q.quarter), label: `Q${q.quarter}`, ariaLabel: q.quarterName }))}
              value={String(roster.quarter)}
              onChange={(q) => go({ quarter: Number(q) })}
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm transition-opacity in-data-pending:opacity-60">
        {yearName === null ? (
          <Empty heading="No active school year" message="Activate a school year in Settings first." />
        ) : sectionId === null ? (
          <Empty heading="No sections this school year" message="Add a section in Settings › Sections." />
        ) : !roster ? (
          <Empty heading="Could not load the learners" message="Please refresh the page." />
        ) : !learner ? (
          <Empty heading="Pick a learner" message="Choose a learner above to open or generate their progress report for this quarter." />
        ) : !quarter?.available ? (
          <Empty heading="This quarter is not set up yet" message="Set its dates in Settings › School Year before writing its reports." />
        ) : report ? (
          <Editor key={`${report.reportId}-${report.updatedAt}`} report={report} onDirty={setDirty} onChanged={refresh} />
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-gray-800">
              No progress report yet for {capitalizeWords(learner.firstName)}, {quarter.quarterName}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
              The draft is written only from what is recorded this quarter: checklist ratings, practical ratings and digital scores. You can edit every
              word before finalizing.
            </p>
            {["active", "completed"].includes(learner.enrollmentStatus) ? (
              <button type="button" onClick={generate} disabled={pending} className={cn(PRIMARY, "mt-4")}>
                <Sparkles size={14} aria-hidden="true" />
                Generate Progress Report
              </button>
            ) : (
              <p className="mt-3 text-xs font-semibold text-gray-600">This learner has left the section, so no new report can be made.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-semibold text-gray-800">{heading}</p>
      <p className="text-xs text-gray-500 mt-1">{message}</p>
    </div>
  );
}

function Editor({ report, onDirty, onChanged }: { report: Report; onDirty: (dirty: boolean) => void; onChanged: () => void }) {
  const [rows, setRows] = useState(report.rows);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Printable | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const readOnly = report.status === "finalized";
  const dirty = rows.some(
    (r, i) => r.developmentObserved !== report.rows[i].developmentObserved || (r.commentsRemarks ?? "") !== (report.rows[i].commentsRemarks ?? ""),
  );
  const base = `/api/progress-reports/${report.reportId}`;
  const latest = report.versions.at(-1);
  const saved: Printable = {
    header: report.header,
    rows: report.rows,
    status: readOnly && latest ? versionLabel(latest) : "Draft",
    version: readOnly ? latest?.version : undefined,
  };

  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  // The browser asks before a reload or tab close drops unsaved text.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (id: number, patch: Partial<EditorRow>) => setRows((rs) => rs.map((r) => (r.moduleDomainId === id ? { ...r, ...patch } : r)));

  const send = async (path: string, method: "PUT" | "POST", body: object, done: string) => {
    setBusy(true);
    try {
      const res = await apiFetch(path, { method, body: JSON.stringify(body) });
      if (!res.ok) return void toast.error(await errorOf(res, "Could not save. Please try again."));
      toast.success(done);
      onDirty(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    send(
      base,
      "PUT",
      {
        updatedAt: report.updatedAt,
        rows: rows.map((r) => ({ moduleDomainId: r.moduleDomainId, developmentObserved: r.developmentObserved, commentsRemarks: r.commentsRemarks })),
      },
      "Draft saved.",
    );

  const openVersion = async (version: number, download: boolean) => {
    const res = await apiFetch(`${base}/versions/${version}`);
    if (!res.ok) return void toast.error("Could not load that version.");
    const snap = (await res.json()) as Snapshot;
    const printable: Printable = {
      header: snap.header,
      rows: snap.rows,
      status: versionLabel(snap),
      version: snap.version,
    };
    if (download) await downloadProgressReport(printable);
    else setPreview(printable);
  };

  // A subject's rows sit together; MAPEH's shared remarks box comes after its three subheadings.
  const groups = rows.reduce<EditorRow[][]>((out, r) => {
    const last = out.at(-1);
    if (last && last[0].subject === r.subject) last.push(r);
    else out.push([r]);
    return out;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-base font-bold text-gray-900">
            {reportLearnerName(report.header)} · {report.header.quarterName}
          </h2>
          <p className="text-xs text-gray-500">
            {readOnly ? (
              <span className={cn(CHIP, "bg-emerald-50 text-emerald-700")}>Finalized · Version {latest?.version}</span>
            ) : (
              <span className={cn(CHIP, "bg-amber-50 text-amber-700")}>Draft{report.correctionReason ? ` · Correction: ${report.correctionReason}` : ""}</span>
            )}
          </p>
        </div>
        {!readOnly && (
          <>
            <button
              type="button"
              disabled={busy || dirty}
              title={dirty ? "Save your changes first" : "Rebuild the draft from the latest results. Rows you edited keep your words."}
              onClick={() => send(`${base}/regenerate`, "POST", {}, "Draft rebuilt. Your edited rows were kept.")}
              className={SECONDARY}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Regenerate draft
            </button>
            <button type="button" disabled={busy || !dirty} onClick={save} className={SECONDARY}>
              <Save size={14} aria-hidden="true" />
              Save draft
            </button>
          </>
        )}
        <button type="button" disabled={dirty} title={dirty ? "Save your changes first" : undefined} onClick={() => setPreview(saved)} className={SECONDARY}>
          <Eye size={14} aria-hidden="true" />
          Preview
        </button>
        <button type="button" disabled={dirty} title={dirty ? "Save your changes first" : undefined} onClick={() => downloadProgressReport(saved)} className={SECONDARY}>
          <Download size={14} aria-hidden="true" />
          Download PDF
        </button>
        {readOnly ? (
          <button type="button" disabled={busy} onClick={() => setReason("")} className={SECONDARY}>
            <Unlock size={14} aria-hidden="true" />
            Reopen for correction
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || dirty}
            title={dirty ? "Save your changes first" : undefined}
            onClick={() =>
              window.confirm("Finalize this report? It becomes read-only, and any later change needs a correction with a reason.") &&
              send(`${base}/finalize`, "POST", { updatedAt: report.updatedAt }, "Report finalized.")
            }
            className={PRIMARY}
          >
            <Lock size={14} aria-hidden="true" />
            Finalize
          </button>
        )}
      </div>

      {reason !== null && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(`${base}/reopen`, "POST", { reason }, "Reopened for correction.");
          }}
        >
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-bold text-gray-700">
            Reason for the correction
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required className={TEXTAREA} />
          </label>
          <button type="submit" disabled={busy || !reason.trim()} className={PRIMARY}>
            Reopen
          </button>
          <button type="button" onClick={() => setReason(null)} className={SECONDARY}>
            Cancel
          </button>
        </form>
      )}

      {groups.map((group) => {
        const remarksRow = group.find((r) => r.remarksRow);
        return (
          <section key={group[0].subject} className="rounded-lg border border-gray-200">
            <h3 className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-bold tracking-wide text-gray-800">{group[0].subject}</h3>
            <div className="space-y-4 p-4">
              {group.map((row) => (
                <div key={row.moduleDomainId} className="space-y-1.5">
                  <TextField
                    label={row.subheading ? `${row.subheading} — Development Observed` : "Development Observed"}
                    value={row.developmentObserved}
                    generated={row.generatedObserved}
                    maxLength={2000}
                    rows={5}
                    readOnly={readOnly}
                    onChange={(developmentObserved) => set(row.moduleDomainId, { developmentObserved })}
                  />
                  <EvidenceList
                    evidence={row.evidence}
                    quarter={report.header.quarter}
                    onInsert={
                      readOnly
                        ? undefined
                        : (text) => set(row.moduleDomainId, { developmentObserved: [row.developmentObserved.trim(), text].filter(Boolean).join(" ") })
                    }
                  />
                </div>
              ))}
              {remarksRow && (
                <TextField
                  label={group.length > 1 ? `Comments/Remarks (one box for all of ${group[0].subject})` : "Comments/Remarks"}
                  value={remarksRow.commentsRemarks ?? ""}
                  maxLength={1500}
                  rows={3}
                  readOnly={readOnly}
                  onChange={(commentsRemarks) => set(remarksRow.moduleDomainId, { commentsRemarks })}
                />
              )}
            </div>
          </section>
        );
      })}

      {report.unplaced.length > 0 && (
        <section className="rounded-lg border border-dashed border-gray-300 p-4">
          <h3 className="text-xs font-bold text-gray-800">Skills not placed on a row</h3>
          <p className="mb-2 text-xs text-gray-500">
            These checklist skills are not linked to an activity, and their area appears on more than one row, so the draft leaves them out. Mention them
            yourself if they matter.
          </p>
          <EvidenceList evidence={report.unplaced} quarter={report.header.quarter} open />
        </section>
      )}

      {report.versions.length > 0 && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-2 text-xs font-bold text-gray-800">Version history</h3>
          <ul className="divide-y divide-gray-100 text-xs text-gray-700">
            {report.versions.map((v) => (
              <li key={v.version} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-semibold text-gray-900">Version {v.version}</span>
                <span>
                  finalized {dateOf(v.finalizedAt)} by {v.finalizedBy}
                </span>
                {v.correctionReason && <span className="text-amber-700">· correction: {v.correctionReason}</span>}
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => openVersion(v.version, false)} className={SECONDARY}>
                    <Eye size={14} aria-hidden="true" />
                    Preview
                  </button>
                  <button type="button" onClick={() => openVersion(v.version, true)} className={SECONDARY}>
                    <Download size={14} aria-hidden="true" />
                    PDF
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ModalShell
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Progress Report Preview"
        subtitle={preview?.status}
        headerId="progress-report-preview"
        maxWidth="max-w-4xl"
        panelClassName="max-h-[90vh] overflow-y-auto"
      >
        {preview && <Preview {...preview} />}
      </ModalShell>
    </div>
  );
}

/**
 * A text box marked as the generated draft or as the teacher's own words, with the latest draft one tap away.
 * Without `generated` it is the teacher's alone (Comments/Remarks): no badge, no draft.
 */
function TextField({
  label,
  value,
  generated,
  maxLength,
  rows,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  generated?: string | null;
  maxLength: number;
  rows: number;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const drafted = generated !== undefined;
  const edited = value !== (generated ?? "");
  const [showDraft, setShowDraft] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        {drafted &&
          (edited ? (
            <span className={cn(CHIP, "bg-amber-50 text-amber-700")}>Edited by teacher</span>
          ) : (
            <span className={cn(CHIP, "bg-sky-50 text-sky-700")}>Generated</span>
          ))}
        {edited && !readOnly && generated && (
          <button type="button" onClick={() => setShowDraft((s) => !s)} className="cursor-pointer text-[11px] font-semibold text-sidebar underline-offset-2 hover:underline">
            {showDraft ? "Hide generated draft" : "Compare with generated draft"}
          </button>
        )}
        <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        readOnly={readOnly}
        placeholder={drafted || readOnly ? undefined : "Write your remarks."}
        aria-label={label}
        className={TEXTAREA}
      />
      {showDraft && edited && generated && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          <p className="whitespace-pre-line">{generated}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => (onChange(generated), setShowDraft(false))} className={SECONDARY}>
              Use generated draft
            </button>
            <button type="button" onClick={() => setShowDraft(false)} className={SECONDARY}>
              Keep mine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceList({ evidence, quarter, open = false, onInsert }: { evidence: Evidence[]; quarter: number; open?: boolean; onInsert?: (text: string) => void }) {
  if (evidence.length === 0) return <p className="text-[11px] text-gray-400">No checklist skills for this row this quarter.</p>;
  const assessed = evidence.filter((e) => e.status === "assessed").length;

  return (
    <details open={open} className="group rounded-lg bg-stone-50 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-gray-700">
        Evidence: {assessed} of {evidence.length} skill{evidence.length === 1 ? "" : "s"} assessed
      </summary>
      <ul className="mt-2 space-y-2">
        {evidence.map((e) => (
          <li key={e.itemId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {e.level ? (
              <span className={cn(CHIP, LEVEL[e.level].className)}>{LEVEL[e.level].label}</span>
            ) : (
              <span className={cn(CHIP, "bg-gray-100 text-gray-600")}>{e.status === "awaiting_rating" ? "Awaiting your rating" : "Not yet assessed"}</span>
            )}
            <span className="font-medium text-gray-900">{e.item}</span>
            {e.activityName && <span className="text-gray-500">· {e.activityName}</span>}
            {e.checklist && <span className="text-gray-600">· Checklist: {CHECKLIST_LABEL[e.checklist.rating]}</span>}
            {e.result?.maxScore != null && (
              <span className="text-gray-600">
                · Score {e.result.score}/{e.result.maxScore}
              </span>
            )}
            {e.result?.rating && <span className="text-gray-600">· Practical: {PRACTICAL_RESULT_LABEL[e.result.rating]}</span>}
            {e.result && e.result.playedQuarter !== quarter && <span className="text-gray-500">· played in Q{e.result.playedQuarter}</span>}
            {e.source && <span className="text-gray-400">(used: {e.source})</span>}
            {[e.checklist?.remarks, e.result?.remarks].filter((r): r is string => !!r).map((remark) => (
              <span key={remark} className="flex w-full items-center gap-2 pl-2 text-gray-600">
                <span className="italic">“{remark}”</span>
                {onInsert && (
                  <button type="button" onClick={() => onInsert(remark)} className="cursor-pointer text-[11px] font-semibold text-sidebar hover:underline">
                    Insert
                  </button>
                )}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The same rows the PDF prints, as HTML. */
function Preview({ header, rows }: Printable) {
  return (
    <div className="space-y-3 p-6 text-sm text-gray-900">
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <div className="space-y-0.5 font-bold">
          <p>Learner Name: {reportLearnerName(header)}</p>
          <p>
            Section: {header.gradeLevel} - {header.sectionName}
          </p>
          <p>Term: {header.quarterName}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p>School Year: {header.schoolYear}</p>
          <p>Teacher: {header.teacherName}</p>
        </div>
      </div>
      <h2 className="text-center text-base font-bold">PROGRESS REPORT</h2>
      <table className="w-full table-fixed border-collapse border border-black text-xs [&_td]:border [&_td]:border-black [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-black [&_th]:p-2">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[47%]" />
          <col className="w-[35%]" />
        </colgroup>
        <thead className="bg-stone-100">
          <tr>
            <th>Subject/Activity</th>
            <th>Development Observed</th>
            <th>Comments/Remarks</th>
          </tr>
        </thead>
        <tbody>
          {printedRows(rows).map((p) => (
            <tr key={p.subject}>
              <td className="text-center font-bold">{p.subject}</td>
              <td className="space-y-3">
                {p.observed.map((o, i) => (
                  <div key={i}>
                    {o.subheading && <p className="font-bold">{o.subheading}</p>}
                    <p className="whitespace-pre-line">{o.text}</p>
                  </div>
                ))}
              </td>
              <td className="whitespace-pre-line">{p.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
