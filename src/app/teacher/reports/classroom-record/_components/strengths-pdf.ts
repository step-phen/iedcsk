import { LOGO, SCHOOL, pngDataUrl } from "@/app/teacher/reports/learner-list/_components/learner-list-report";
import type { ActivityResult } from "./strengths-report";

const QUARTER_NAMES = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

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
  const logo = await pngDataUrl(LOGO).catch(() => null);
  const quarterName = QUARTER_NAMES[quarter - 1];
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const table = {
    theme: "grid" as const,
    showHead: "everyPage" as const,
    margin: { top: 176, left: 40, right: 40, bottom: 50 },
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
    body: results.map((r) => [activityCell(r), r.result, interpretation(r)]),
    columnStyles: { 1: { cellWidth: inner * 0.2, halign: "center" }, 2: { cellWidth: inner * 0.25 } },
  });

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
  doc.text(
    "Results are each activity's latest recorded score or practical rating. 80% and up: Good performance; 60-79%: Developing; below 60% or a rating of 1-2: Needs more practice.",
    40,
    lastY() + 14,
    { maxWidth: inner },
  );

  // Header and footer on every page, once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setTextColor(20);
    if (logo) doc.addImage(logo, "PNG", 40, 26, 48, 48);
    doc.setFont("helvetica", "bold").setFontSize(15).text(SCHOOL, width / 2, 54, { align: "center" });
    doc.setDrawColor(91, 6, 16).setLineWidth(2).line(40, 84, width - 40, 84);

    doc.setFontSize(10).text(`Learner Name: ${learnerName}`, 40, 106);
    doc.text(`Section: ${section}`, 40, 121);
    doc.text(`Term: ${quarterName}`, 40, 136);
    doc.setFont("helvetica", "normal");
    doc.text(`School Year: ${schoolYear}`, width - 40, 121, { align: "right" });
    doc.text(`Teacher: ${teacherName ?? "-"}`, width - 40, 136, { align: "right" });
    doc.setFont("helvetica", "bold").setFontSize(14).text("STRENGTHS AND AREAS FOR IMPROVEMENT", width / 2, 162, { align: "center" });

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(`Strengths and weaknesses report | ${quarterName}`, 40, height - 24);
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 24, { align: "right" });
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`strengths-${slug(learnerName)}-${slug(schoolYear)}-q${quarter}.pdf`);
}
