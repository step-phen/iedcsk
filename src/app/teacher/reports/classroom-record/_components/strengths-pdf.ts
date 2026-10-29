import { QUARTER_NAMES, REPORT_MARGIN, drawLearnerReportChrome, lastTableY, slug } from "@/lib/report-pdf";
import type { ActivityResult } from "./strengths-report";

/** One learner's activity results for a quarter as an A4 PDF: the needs-practice list first, then every result. */
export async function downloadStrengthsReport({
  learnerName,
  section,
  schoolYear,
  teacherName,
  quarter,
  results,
  interpretation,
}: {
  learnerName: string;
  section: string;
  schoolYear: string;
  teacherName: string | null;
  quarter: number;
  results: ActivityResult[];
  interpretation: (r: ActivityResult) => string;
}) {
  // Loaded on click so the PDF library stays out of the page's first load.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const inner = width - 80;
  const quarterName = QUARTER_NAMES[quarter - 1];
  const lastY = () => lastTableY(doc);
  const table = {
    theme: "grid" as const,
    showHead: "everyPage" as const,
    margin: REPORT_MARGIN,
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, lineColor: [0, 0, 0] as [number, number, number], lineWidth: 0.75, textColor: 20, valign: "top" as const },
    headStyles: { fillColor: [242, 242, 242] as [number, number, number], textColor: 20, fontStyle: "bold" as const, fontSize: 9 },
  };
  const activityCell = (r: ActivityResult) => [r.domain, r.activity, ...(r.skills.length ? [`Skill: ${r.skills.join("; ")}`] : [])].join("\n");
  const low = results.filter((r) => r.band === "needs_help");

  autoTable(doc, {
    ...table,
    head: [[{ content: "NEEDS MORE PRACTICE", colSpan: 2 }]],
    body: low.length ? low.map((r) => [activityCell(r), r.result]) : [[{ content: "No activity below 60% this quarter.", colSpan: 2 }]],
    headStyles: { ...table.headStyles, fillColor: [255, 228, 230] },
    columnStyles: { 1: { cellWidth: inner * 0.2, halign: "center" } },
  });

  autoTable(doc, {
    ...table,
    startY: lastY() + 18,
    head: [["Domain / Activity", "Result", "Interpretation"]],
    body: results.map((r) => [activityCell(r), r.playedNote ? `${r.result}\n(${r.playedNote})` : r.result, interpretation(r)]),
    columnStyles: { 1: { cellWidth: inner * 0.2, halign: "center" }, 2: { cellWidth: inner * 0.25 } },
  });

  // The bands note under the table; a new page when it would run into the footer.
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
  const note = doc.splitTextToSize(
    "Results are each activity's latest recorded score or practical rating. 80% and up: Good performance; 60-79%: Developing; below 60% or a rating of 1-2: Needs more practice.",
    inner,
  );
  let noteY = lastY() + 14;
  if (noteY + note.length * 10 > height - 40) {
    doc.addPage();
    noteY = table.margin.top;
  }
  doc.text(note, 40, noteY);

  await drawLearnerReportChrome(doc, {
    title: "STRENGTHS AND AREAS FOR IMPROVEMENT",
    learnerName,
    section,
    term: quarterName,
    schoolYear,
    teacherName: teacherName ?? "-",
    footer: `Strengths and weaknesses report | ${quarterName}`,
  });

  doc.save(`strengths-${slug(learnerName)}-${slug(schoolYear)}-q${quarter}.pdf`);
}
