import { LOGO, SCHOOL, pngDataUrl } from "@/app/teacher/reports/learner-list/_components/learner-list-report";
import { drawNotedBy, lastTableY, slug } from "@/lib/report-pdf";
import type { AttendanceRow } from "./attendance-tab";

export interface Sf2Learner {
  id: number;
  name: string;
  lrn: string | null;
  gradeLevel: string | null;
  section: string | null;
  teacherName: string | null;
}

export interface Sf2Summary {
  present: number;
  absent: number;
  late: number;
  rate: number;
}

const TITLE = "School Form 2 (SF 2) - Daily Attendance Report of Learners";

/** Downloads one learner's attendance for a month as an SF-2 style PDF. */
export async function downloadSf2({
  learner,
  monthLabel,
  rows,
  summary,
}: {
  learner: Sf2Learner;
  monthLabel: string;
  rows: AttendanceRow[];
  summary: Sf2Summary;
}) {
  // Loaded on click so the PDF library stays out of the page's first load.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  const logo = await pngDataUrl(LOGO).catch(() => null);
  if (logo) doc.addImage(logo, "PNG", 40, 30, 50, 50);
  doc.setFont("helvetica", "bold").setFontSize(14).text(SCHOOL, width / 2, 50, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(11).text(TITLE, width / 2, 68, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Learner: ${learner.name}`, 40, 104);
  doc.text(`LRN: ${learner.lrn ?? "-"}`, 40, 118);
  doc.text(`Grade & Section: ${[learner.gradeLevel, learner.section].filter(Boolean).join(" - ") || "-"}`, 40, 132);
  doc.text(`Month: ${monthLabel}`, width - 40, 104, { align: "right" });
  doc.text(`Adviser: ${learner.teacherName ?? "-"}`, width - 40, 118, { align: "right" });

  const excused = rows.filter((r) => r.status === "Excused").length;
  autoTable(doc, {
    startY: 148,
    head: [["Date", "Day", "Status", "Time In", "Remarks"]],
    body: rows.map((r) => [r.date, r.day, r.status, r.time, r.reason ?? ""]),
    foot: [
      [
        {
          content: `Present: ${summary.present}    Absent: ${summary.absent}    Late: ${summary.late}    Excused: ${excused}    Attendance Rate: ${summary.rate.toFixed(1)}%`,
          colSpan: 5,
        },
      ],
    ],
    showFoot: "lastPage",
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [91, 6, 16], textColor: 255 },
    footStyles: { fillColor: [245, 245, 245], textColor: 30 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
    // Absent days stand out in red, like the roll-call ledger on screen.
    didParseCell: ({ section, column, cell }) => {
      if (section === "body" && column.index === 2 && cell.raw === "Absent") cell.styles.textColor = [200, 30, 30];
    },
    margin: { left: 40, right: 40, bottom: 60 },
    didDrawPage: ({ pageNumber }) => {
      doc.setFontSize(8).text(`Page ${pageNumber}`, width - 40, height - 20, { align: "right" });
    },
  });

  drawNotedBy(doc, lastTableY(doc), 40);

  doc.save(`sf2-${slug(learner.name)}-${slug(monthLabel)}.pdf`);
}
