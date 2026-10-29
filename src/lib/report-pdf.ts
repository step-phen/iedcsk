import type { jsPDF } from "jspdf";
import { LOGO, SCHOOL, pngDataUrl } from "@/app/teacher/reports/learner-list/_components/learner-list-report";

export const QUARTER_NAMES = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

/** File-name safe: "Dela Cruz, Ana" -> "dela-cruz-ana". */
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Where the last jspdf-autotable table ended on its page. */
export const lastTableY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

/** Table margins that leave room for the header and footer drawLearnerReportChrome adds. */
export const REPORT_MARGIN = { top: 176, left: 40, right: 40, bottom: 50 };

/**
 * The shared look of a one-learner report: logo, school name and learner details on top, a footer note and page
 * numbers at the bottom. Call it last, once every page exists, so "Page x of y" knows the total.
 */
export async function drawLearnerReportChrome(
  doc: jsPDF,
  h: { title: string; learnerName: string; section: string; term: string; schoolYear: string; teacherName: string; footer: string },
) {
  const logo = await pngDataUrl(LOGO).catch(() => null);
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setTextColor(20);
    if (logo) doc.addImage(logo, "PNG", 40, 26, 48, 48);
    doc.setFont("helvetica", "bold").setFontSize(15).text(SCHOOL, width / 2, 54, { align: "center" });
    doc.setDrawColor(91, 6, 16).setLineWidth(2).line(40, 84, width - 40, 84);

    doc.setFontSize(10).text(`Learner Name: ${h.learnerName}`, 40, 106);
    doc.text(`Section: ${h.section}`, 40, 121);
    doc.text(`Term: ${h.term}`, 40, 136);
    doc.setFont("helvetica", "normal");
    doc.text(`School Year: ${h.schoolYear}`, width - 40, 121, { align: "right" });
    doc.text(`Teacher: ${h.teacherName}`, width - 40, 136, { align: "right" });
    doc.setFont("helvetica", "bold").setFontSize(14).text(h.title, width / 2, 162, { align: "center" });

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(90);
    doc.text(h.footer, 40, height - 24);
    doc.text(`Page ${page} of ${pages}`, width - 40, height - 24, { align: "right" });
  }
}
