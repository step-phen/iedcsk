import { LOGO, SCHOOL, pngDataUrl } from "@/app/teacher/reports/learner-list/_components/learner-list-report";
import { capitalizeWords, middleInitial } from "@/lib/learners";

/** Who and when a report is for; frozen inside a finalized version's snapshot. */
export interface ReportHeader {
  firstName: string;
  middleName: string | null;
  lastName: string;
  extensionName: string | null;
  gender: "Male" | "Female" | null;
  gradeLevel: string;
  sectionName: string;
  schoolYear: string;
  quarter: number;
  quarterName: string;
  teacherName: string;
}

/** One saved report row; MAPEH has three, one per subheading, and keeps its shared remarks on the first. */
export interface ReportRow {
  moduleDomainId: number;
  subject: string;
  subheading: string | null;
  remarksRow: boolean;
  developmentObserved: string;
  commentsRemarks: string | null;
}

export interface PrintedRow {
  subject: string;
  observed: { subheading: string | null; text: string }[];
  remarks: string;
}

/** "Gabriel M. Reyes", as on the printed sample, whatever case the name was typed in. */
export function reportLearnerName(h: ReportHeader) {
  return capitalizeWords([h.firstName, middleInitial(h.middleName), h.lastName, h.extensionName].filter(Boolean).join(" "));
}

/** Rows as printed: a subject's rows merge into one, so MAPEH shows its subheadings in one cell beside one remarks cell. */
export function printedRows(rows: ReportRow[]): PrintedRow[] {
  const out: PrintedRow[] = [];
  for (const r of rows) {
    let last = out.at(-1);
    if (!last || last.subject !== r.subject) out.push((last = { subject: r.subject, observed: [], remarks: "" }));
    last.observed.push({ subheading: r.subheading, text: r.developmentObserved });
    if (r.remarksRow) last.remarks = r.commentsRemarks ?? "";
  }
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Downloads the report as an A4 PDF laid out like the printed sample. Fed only saved data (a draft as last saved,
 * or a finalized version's snapshot), the same object the on-screen preview renders.
 */
export async function downloadProgressReport({
  header,
  rows,
  status,
  version,
}: {
  header: ReportHeader;
  rows: ReportRow[];
  /** Footer note, e.g. "Draft" or "Version 2, corrected 14 Oct 2026". */
  status: string;
  version?: number;
}) {
  // Loaded on click so the PDF library stays out of the page's first load.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const inner = width - 80;
  const logo = await pngDataUrl(LOGO).catch(() => null);
  const name = reportLearnerName(header);
  const subheadings = new Set(rows.flatMap((r) => (r.subheading ? [r.subheading] : [])));
  let drawBold: (() => void) | null = null;

  autoTable(doc, {
    head: [["Subject/Activity", "Development Observed", "Comments/Remarks"]],
    body: printedRows(rows).map((p) => [
      p.subject,
      p.observed.map((o) => (o.subheading ? `${o.subheading}\n${o.text}` : o.text)).join("\n\n"),
      p.remarks,
    ]),
    theme: "grid",
    // Long text breaks across pages, and the column headings repeat on each one.
    showHead: "everyPage",
    rowPageBreak: "auto",
    margin: { top: 176, left: 40, right: 40, bottom: 50 },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 8, lineColor: [0, 0, 0], lineWidth: 0.75, textColor: 20, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: [242, 242, 242], textColor: 20, fontStyle: "bold", fontSize: 9, halign: "center" },
    columnStyles: {
      0: { cellWidth: inner * 0.18, fontStyle: "bold", fontSize: 9, halign: "center" },
      1: { cellWidth: inner * 0.47 },
      2: { cellWidth: inner * 0.35 },
    },
    // Subheading lines are blanked here and redrawn bold after the cell, so row heights still come from plain text.
    willDrawCell: ({ section, column, cell }) => {
      if (section !== "body" || column.index !== 1) return;
      const bold = cell.text.flatMap((line, i) => (subheadings.has(line) ? [[line, i] as const] : []));
      if (bold.length === 0) return;
      const pos = cell.getTextPos();
      const fontSize = doc.getFontSize();
      const lineHeight = fontSize * doc.getLineHeightFactor();
      // autotable's own top offset for the first line (jspdf-autotable autoTableText).
      const top = pos.y + fontSize * (2 - 1.15);
      for (const [, i] of bold) cell.text[i] = "";
      drawBold = () => {
        doc.setFont("helvetica", "bold");
        for (const [line, i] of bold) doc.text(line, pos.x, top + i * lineHeight);
        doc.setFont("helvetica", "normal");
      };
    },
    didDrawCell: () => {
      drawBold?.();
      drawBold = null;
    },
  });

  // Header and footer on every page, once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setTextColor(20);
    if (logo) doc.addImage(logo, "PNG", 40, 26, 48, 48);
    doc.setFont("helvetica", "bold").setFontSize(15).text(SCHOOL, width / 2, 54, { align: "center" });
    doc.setDrawColor(91, 6, 16).setLineWidth(2).line(40, 84, width - 40, 84);

    doc.setFontSize(10).text(`Learner Name: ${name}`, 40, 106);
    doc.text(`Section: ${header.gradeLevel} - ${header.sectionName}`, 40, 121);
    doc.text(`Term: ${header.quarterName}`, 40, 136);
    doc.setFont("helvetica", "normal");
    doc.text(`School Year: ${header.schoolYear}`, width - 40, 121, { align: "right" });
    doc.text(`Teacher: ${header.teacherName}`, width - 40, 136, { align: "right" });
    doc.setFont("helvetica", "bold").setFontSize(14).text("PROGRESS REPORT", width / 2, 162, { align: "center" });

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(`${header.gradeLevel} | Individual learner progress report | ${status}`, 40, height - 24);
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 24, { align: "right" });
  }

  doc.save(`progress-report-${slug(name)}-${slug(header.schoolYear)}-q${header.quarter}${version ? `-v${version}` : ""}.pdf`);
}
