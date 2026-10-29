import { LOGO, SCHOOL, pngDataUrl } from "@/app/teacher/reports/learner-list/_components/learner-list-report";
import { RATING_BADGE } from "@/app/teacher/developmental-checklist/_components/checklist-table";
import { capitalizeWords } from "@/lib/learners";
import type { ProgressItem } from "./progress-tab";

export interface ChecklistSummaryLearner {
  name: string;
  gradeLevel: string | null;
  section: string | null;
  schoolYear: string | null;
  teacherName: string | null;
}

const QUARTER_NAMES = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];
const statusLabel = (i: ProgressItem) => (i.rating ? RATING_BADGE[i.rating].label : "Not rated yet");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Skills of one quarter grouped by domain, in the order the API sends them. */
export function byDomain(items: ProgressItem[]) {
  const groups: { domainName: string; skills: ProgressItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.domainName === item.domainName);
    if (group) group.skills.push(item);
    else groups.push({ domainName: item.domainName, skills: [item] });
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
  const logo = await pngDataUrl(LOGO).catch(() => null);
  const quarterName = QUARTER_NAMES[quarter - 1];
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const table = { theme: "grid" as const, margin: { top: 176, left: 40, right: 40, bottom: 50 }, styles: { fontSize: 9.5, cellPadding: 6, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.5, textColor: 20, valign: "top" as const }, headStyles: { fillColor: [242, 242, 242] as [number, number, number], textColor: 20, fontStyle: "bold" as const } };

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

  // Header and footer on every page, once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setTextColor(20);
    if (logo) doc.addImage(logo, "PNG", 40, 26, 48, 48);
    doc.setFont("helvetica", "bold").setFontSize(15).text(SCHOOL, width / 2, 54, { align: "center" });
    doc.setDrawColor(91, 6, 16).setLineWidth(2).line(40, 84, width - 40, 84);

    doc.setFontSize(10).text(`Learner Name: ${learner.name}`, 40, 106);
    doc.text(`Section: ${[learner.gradeLevel, learner.section].filter(Boolean).join(" - ") || "-"}`, 40, 121);
    doc.text(`Term: ${quarterName}`, 40, 136);
    doc.setFont("helvetica", "normal");
    doc.text(`School Year: ${learner.schoolYear ?? "-"}`, width - 40, 121, { align: "right" });
    doc.text(`Teacher: ${learner.teacherName ?? "-"}`, width - 40, 136, { align: "right" });
    doc.setFont("helvetica", "bold").setFontSize(14).text("DEVELOPMENTAL CHECKLIST SUMMARY", width / 2, 162, { align: "center" });

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(`${learner.gradeLevel ?? ""} | Individual developmental checklist summary | ${quarterName}`, 40, height - 24);
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 24, { align: "right" });
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`checklist-summary-${slug(learner.name)}-${slug(learner.schoolYear ?? "")}-q${quarter}.pdf`);
}
