import { RATING_BADGE, isAccomplished, isTaught, ratingText } from "@/app/teacher/developmental-checklist/_components/checklist-table";
import { capitalizeWords } from "@/lib/learners";
import { QUARTER_NAMES, REPORT_MARGIN, drawLearnerReportChrome, drawNotedBy, lastTableY, slug } from "@/lib/report-pdf";
import type { ProgressItem } from "./progress-tab";

export interface ChecklistSummaryLearner {
  name: string;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  teacherName: string | null;
}

const statusLabel = (i: ProgressItem) => (i.rating ? ratingText(i.rating) : "Not rated yet");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Skills of one quarter grouped by domain, in the order the API sends them. */
export function byDomain(items: ProgressItem[]) {
  const groups: { domainId: number; domainName: string; skills: ProgressItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.domainId === item.domainId);
    if (group) group.skills.push(item);
    else groups.push({ domainId: item.domainId, domainName: item.domainName, skills: [item] });
  }
  return groups;
}

/** The overall paragraph: counts only from recorded ratings, never a guess about skills not yet rated. */
export function summaryText(firstName: string, items: ProgressItem[]) {
  const count = (r: ProgressItem["rating"]) => items.filter((i) => i.rating === r).length;
  const done = items.filter((i) => isAccomplished(i.rating)).length;
  const highly = count("achieved");
  // "/" skills were not taught yet, so they are not part of the "of N"; the next sentence counts them.
  const taught = items.filter((i) => isTaught(i.rating)).length;
  const sentences = [
    `${capitalizeWords(firstName)} has accomplished ${done} of ${plural(taught, "developmental skill")} this quarter${highly ? `, ${highly} of them highly accomplished` : ""}.`,
  ];
  const rest = [
    [count("needs_support"), "needing support"],
    [count("not_yet_observed"), "not yet introduced"],
    [count(null), "not yet rated"],
  ].filter(([n]) => n) as [number, string][];
  if (rest.length) sentences.push(`${rest.map(([n, what]) => `${n} ${what}`).join(", ")}.`.replace(/^./, (c) => c.toUpperCase()));

  const groups = byDomain(items);
  const mastered = groups
    .filter((g) => g.skills.some((s) => isTaught(s.rating)) && g.skills.every((s) => !isTaught(s.rating) || isAccomplished(s.rating)))
    .map((g) => g.domainName);
  const support = groups.filter((g) => g.skills.some((s) => s.rating === "needs_support")).map((g) => g.domainName);
  if (mastered.length) sentences.push(`All skills accomplished in ${mastered.join(", ")}.`);
  if (support.length) sentences.push(`More support is needed in ${support.join(", ")}.`);
  return sentences.join(" ");
}

/** Downloads one learner's Developmental Checklist for a quarter as an A4 PDF to hand to the parents. */
export async function downloadChecklistSummary({
  learner,
  firstName,
  quarter,
  items,
}: {
  learner: ChecklistSummaryLearner;
  firstName: string;
  quarter: number;
  /** The quarter's skills only. */
  items: ProgressItem[];
}) {
  // Loaded on click so the PDF library stays out of the page's first load.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const quarterName = QUARTER_NAMES[quarter - 1];
  const lastY = () => lastTableY(doc);
  const table = { theme: "grid" as const, margin: REPORT_MARGIN, styles: { fontSize: 9.5, cellPadding: 6, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.5, textColor: 20, valign: "top" as const }, headStyles: { fillColor: [242, 242, 242] as [number, number, number], textColor: 20, fontStyle: "bold" as const } };

  // 1. Every skill of the quarter with its status, under its domain.
  autoTable(doc, {
    ...table,
    head: [["Developmental Indicator / Skill", "Status"]],
    body: byDomain(items).flatMap((g) => [
      [{ content: `${g.domainName} (${g.skills.filter((s) => isAccomplished(s.rating)).length} of ${g.skills.filter((s) => isTaught(s.rating)).length} accomplished)`, colSpan: 2, styles: { fontStyle: "bold", fillColor: [246, 241, 223] } }],
      ...g.skills.map((s) => [s.item, statusLabel(s)]),
    ]),
    showHead: "everyPage",
    columnStyles: { 1: { cellWidth: 150, halign: "center" } },
  });

  // 2. Accomplished skills beside the ones needing support, then the overall paragraph.
  const developed = items.filter((i) => isAccomplished(i.rating)).map((i) => `• ${i.item} (${RATING_BADGE[i.rating!].code})`);
  const practice = items.filter((i) => i.rating === "needs_support").map((i) => `• ${i.item}`);
  autoTable(doc, {
    ...table,
    startY: lastY() + 18,
    head: [["Skills Accomplished", "Skills Needing Support"]],
    body: [[developed.join("\n") || "None yet.", practice.join("\n") || "None."]],
    columnStyles: { 0: { cellWidth: (width - 80) / 2 } },
  });
  autoTable(doc, {
    ...table,
    startY: lastY() + 18,
    head: [["Overall Quarterly Developmental Summary"]],
    body: [[summaryText(firstName, items)]],
    styles: { ...table.styles, fontSize: 10, cellPadding: 8 },
  });

  // 3. Two blank "Noted by:" lines.
  drawNotedBy(doc, lastY());

  await drawLearnerReportChrome(doc, {
    title: "DEVELOPMENTAL CHECKLIST SUMMARY",
    learnerName: learner.name,
    section: [learner.gradeLevel, learner.section].filter(Boolean).join(" - ") || "-",
    term: quarterName,
    schoolYear: learner.schoolYear ?? "-",
    teacherName: learner.teacherName ?? "-",
    footer: `${learner.gradeLevel ?? ""} | Individual developmental checklist summary | ${quarterName}`,
  });

  doc.save(`checklist-summary-${slug(learner.name)}-${slug(learner.schoolYear ?? "")}-q${quarter}.pdf`);
}
