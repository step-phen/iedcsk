import { PRACTICAL_RESULT_LABEL } from "@/constants/enums";
import { percentOf } from "@/lib/score-band";
import { LEGEND, learnerName, type Cell, type ClassroomRecord } from "./week-record";

/** What the export says about the record beside its rows; the same choices the screen and print show. */
export interface ExportMeta {
  /** "SY 2026–2027" */
  schoolYear: string;
  /** "Kindergarten - Joy" */
  section: string;
  module: string;
  /** Only for a module with several domains (MAPEH), as on the print header. */
  domain: string | null;
  quarter: number;
  /** The By Week week; null for All Weeks. */
  week: number | null;
  /** "Total" or "Week Total" */
  totalLabel: string;
}

type Value = string | number | null;

/** A missing result stays blank (null), never 0; a digital zero stays "0 / 10". */
function cellText(cell: Cell | undefined): string | null {
  if (!cell) return null;
  // Spaced so Excel opening the CSV reads "8 / 10" as text, not the date 8 October.
  if ("score" in cell) return `${cell.score} / ${cell.maxScore}`;
  return cell.rating ? PRACTICAL_RESULT_LABEL[cell.rating] : "To rate";
}

/** The record as spreadsheet rows, cell for cell and total for total what the table shows; both formats use it. */
export function exportRows(record: ClassroomRecord, meta: ExportMeta) {
  const info: [string, string][] = [
    ["School Year", meta.schoolYear],
    ["Section", meta.section],
    ["Module", meta.module],
    ...(meta.domain ? [["Domain", meta.domain] as [string, string]] : []),
    ["Quarter", String(meta.quarter)],
    ...(meta.week !== null ? [["Week", String(meta.week)] as [string, string]] : []),
  ];
  const header = [
    "#",
    "Learner",
    ...record.columns.map(
      (c) =>
        `Week ${c.week} · ${c.name} (${
          c.format === "practical" ? "Practical, out of 3" : c.maxScore !== null ? `out of ${c.maxScore}` : "Digital"
        })`,
    ),
    `${meta.totalLabel} Score`,
    `${meta.totalLabel} Possible`,
    `${meta.totalLabel} %`,
  ];
  const rows: Value[][] = record.rows.map((row, i) => [
    i + 1,
    // The table capitalizes names with CSS; this is the same rule in text.
    learnerName(row).replace(/(^|\s)\S/g, (c) => c.toUpperCase()),
    ...record.columns.map((c) => cellText(row.cells[c.activityId])),
    row.total?.score ?? null,
    row.total?.maxScore ?? null,
    row.total ? percentOf(row.total.score, row.total.maxScore) : null,
  ]);
  return { info, header, rows };
}

/** Text a spreadsheet would run as a formula gets a leading apostrophe; numbers are left alone.
 *  Leading whitespace and the full-width ＝＋－＠ count too: some spreadsheets trim or normalize them first. */
function csvField(value: Value): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const text = /^[\s=+\-@＝＋－＠]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 with a BOM so Excel reads "–" and "ñ" right; the info lines, a blank line, then the table. */
export function toCsv(record: ClassroomRecord, meta: ExportMeta): string {
  const { info, header, rows } = exportRows(record, meta);
  const lines: Value[][] = [...info, [], header, ...rows];
  return "﻿" + lines.map((line) => line.map(csvField).join(",")).join("\r\n") + "\r\n";
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A real .xlsx: wrapped headers, # and Learner frozen with the header, and the scoring legend under the table. */
export async function toXlsx(record: ClassroomRecord, meta: ExportMeta): Promise<ArrayBuffer> {
  // A CommonJS package: its exports are reliably under default (Node leaves the namespace without them).
  const { Workbook } = (await import("exceljs")).default;
  const { info, header, rows } = exportRows(record, meta);
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Classroom Record");

  sheet.addRow(["Classroom Record"]).font = { bold: true, size: 14 };
  for (const [label, value] of info) sheet.addRow([label, value]).getCell(1).font = { bold: true };
  sheet.addRow([]);

  const headerRow = sheet.addRow(header);
  headerRow.height = 60;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  });
  headerRow.getCell(2).alignment = { wrapText: true, vertical: "middle", horizontal: "left" };

  for (const values of rows) {
    const row = sheet.addRow(values);
    row.eachCell((cell, col) => {
      if (col !== 2) cell.alignment = { horizontal: "center" };
    });
  }

  sheet.columns = header.map((_, i) => ({ width: i === 0 ? 5 : i === 1 ? 32 : i >= header.length - 3 ? 12 : 20 }));
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow.number }];

  sheet.addRow([]);
  sheet.addRow(["Legend"]).font = { bold: true };
  for (const [value, range] of LEGEND) sheet.addRow([PRACTICAL_RESULT_LABEL[value], range]);
  sheet.addRow(["(blank)", "Not done yet"]);
  sheet.addRow(["To rate", "Practical activity waiting for your rating"]);
  sheet.addRow([
    meta.totalLabel,
    "Counts a practical rating as Very Good 3, Good 2, Needs Help 1 (out of 3); % is Score ÷ Possible, rounded",
  ]);

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** classroom-record-kindergarten-joy-mapeh-music-q1-week-3.xlsx */
export function fileName(meta: ExportMeta, ext: "csv" | "xlsx") {
  const parts = [
    "classroom-record",
    meta.section,
    meta.module,
    meta.domain ?? "",
    `q${meta.quarter}`,
    meta.week !== null ? `week-${meta.week}` : "all-weeks",
  ];
  return `${parts.map(slug).filter(Boolean).join("-")}.${ext}`;
}

/** Saves the file through the browser; nothing leaves the device. */
export function download(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Revoked a moment later: some browsers cancel a download whose URL is revoked during the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
