import { RATING_BADGE } from "@/app/teacher/developmental-checklist/_components/checklist-table";
import { capitalizeWords } from "@/lib/learners";
import { QUARTER_NAMES, REPORT_MARGIN, drawLearnerReportChrome, lastTableY, slug } from "@/lib/report-pdf";
import type { ProgressItem } from "./progress-tab";

export interface ChecklistSummaryLearner {
  name: string;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  teacherName: string | null;
}

const statusLabel = (i: ProgressItem) => (i.rating ? RATING_BADGE[i.rating].label : "Not rated yet");
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
  const sentences = [`${capitalizeWords(firstName)} has achieved ${count("achieved")} of ${plural(items.length, "developmental skill")} this quarter.`];
  const rest = [
    [count("developing"), "still developing"],
    [count("needs_support"), "needing support"],
    [count("not_yet_observed"), "not yet observed"],
    [count(null), "not yet rated"],
  ].filter(([n]) => n) as [number, string][];
  if (rest.length) sentences.push(`${rest.map(([n, what]) => `${n} ${what}`).join(", ")}.`.replace(/^./, (c) => c.toUpperCase()));

  const groups = byDomain(items);
  const mastered = groups.filter((g) => g.skills.every((s) => s.rating === "achieved")).map((g) => g.domainName);
  const practice = groups.filter((g) => g.skills.some((s) => s.rating === "developing" || s.rating === "needs_support")).map((g) => g.domainName);
  if (mastered.length) sentences.push(`All skills achieved in ${mastered.join(", ")}.`);
  if (practice.length) sentences.push(`More practice is needed in ${practice.join(", ")}.`);
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
  const height = doc.internal.pageSize.getHeight();
  const quarterName = QUARTER_NAMES[quarter - 1];
  const lastY = () => lastTableY(doc);
  const table = { theme: "grid" as const, margin: REPORT_MARGIN, styles: { fontSize: 9.5, cellPadding: 6, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.5, textColor: 20, valign: "top" as const }, headStyles: { fillColor: [242, 242, 242] as [number, number, number], textColor: 20, fontStyle: "bold" as const } };

  // 1. Every skill of the quarter with its status, under its domain.
  autoTable(doc, {
    ...table,
    head: [["Developmental Indicator / Skill", "Status"]],
    body: byDomain(items).flatMap((g) => [
      [{ content: `${g.domainName} (${g.skills.filter((s) => s.rating === "achieved").length} of ${g.skills.length} achieved)`, colSpan: 2, styles: { fontStyle: "bold", fillColor: [246, 241, 223] } }],
      ...g.skills.map((s) => [s.item, statusLabel(s)]),
    ]),
    showHead: "everyPage",
    columnStyles: { 1: { cellWidth: 110, halign: "center" } },
  });

  // 2. Developed skills beside the ones still needing practice, then the overall paragraph.
  const developed = items.filter((i) => i.rating === "achieved").map((i) => `• ${i.item}`);
  const practice = items.filter((i) => i.rating === "developing" || i.rating === "needs_support").map((i) => `• ${i.item} (${statusLabel(i)})`);
  autoTable(doc, {
    ...table,
    startY: lastY() + 18,
    head: [["Skills Developed", "Skills Needing More Practice"]],
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

  // 3. Adviser and parent sign, on a new page when the last one is full.
  let signY = lastY() + 70;
  if (signY > height - 70) {
    doc.addPage();
    signY = 240;
  }
  doc.setDrawColor(0).setLineWidth(0.75).setFont("helvetica", "normal").setFontSize(10).setTextColor(20);
  for (const [x, name, role] of [
    [40, learner.teacherName ?? "", "Adviser"],
    [width - 240, "", "Parent / Guardian"],
  ] as const) {
    doc.line(x, signY, x + 200, signY);
    if (name) doc.text(name, x + 100, signY - 4, { align: "center" });
    doc.setFontSize(8).text(`${role} (signature over printed name)`, x + 100, signY + 12, { align: "center" }).setFontSize(10);
  }

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
