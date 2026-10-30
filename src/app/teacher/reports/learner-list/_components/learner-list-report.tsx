"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Download, Loader2, Printer } from "lucide-react";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateAge, formatName, gradeLevels, hasMiddleName, matchesLearnerSearch } from "@/lib/learners";
import { formatDatePH } from "@/lib/datetime";
import type { Gender } from "@/constants/enums";
import Pagination from "@/app/teacher/_components/shared/pagination";
import LearnerSearch from "@/app/teacher/learners/_components/learner-search";

/** One row of GET /api/learners. */
export interface LearnerListRow {
  learnerId: number;
  lrn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  extensionName: string | null;
  gender: Gender;
  birthdate: string;
  section: string | null;
}

export const SCHOOL = "Southern de Oro Philippines College";
export const LOGO = "/images/logo/spc-logo.webp";
const COLUMNS = ["No.", "LRN", "Learner Name", "Sex", "Birthdate", "Age", "Section"];
// No., Sex, Age and Status are centered, in the PDF and the printed copy alike.
const PDF_CENTERED = new Set([0, 3, 5, 7]);

/** "Dela Cruz, Juan Santos Jr." with a placeholder middle name left out. */
function fullName(l: LearnerListRow): string {
  const given = [formatName(l.firstName), hasMiddleName(l.middleName) && formatName(l.middleName!), l.extensionName?.trim()];
  return `${formatName(l.lastName)}, ${given.filter(Boolean).join(" ")}`;
}

// Birthdates are date-only, so they are formatted in UTC to keep the day from shifting.
const birthdateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function toCells(l: LearnerListRow, i: number): string[] {
  return [
    String(i + 1),
    l.lrn ?? "N/A",
    fullName(l),
    l.gender,
    birthdateFormat.format(new Date(`${l.birthdate}T00:00:00Z`)),
    String(calculateAge(l.birthdate)),
    l.section ?? "—",
  ];
}

/** Two blank "Noted by:" lines at the foot of a printed copy, as drawNotedBy puts them on the PDFs. */
export function NotedBy() {
  return (
    <div className="mt-[30pt] flex justify-between break-inside-avoid text-[10pt]">
      {[0, 1].map((i) => (
        <div key={i} className="w-[200pt]">
          <p>Noted by:</p>
          <div className="mt-[30pt] border-t-[0.75pt] border-black" />
        </div>
      ))}
    </div>
  );
}

/** jsPDF can't read webp, so the logo is redrawn on a canvas and handed over as PNG. */
export async function pngDataUrl(src: string): Promise<string> {
  const img = document.createElement("img");
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

const subscribeNoop = () => () => {};

// reportTitle is the second line of the PDF and printed header, and names the downloaded file.
export default function LearnerListReport({
  learners,
  teacherName,
  reportTitle = "Kindergarten List of Learners",
  emptyHeading = "No learners yet",
  emptyMessage = "Learners you add appear here, ready to print.",
  status,
  pageSize,
  dateLine,
}: {
  learners: LearnerListRow[];
  teacherName: string | null;
  reportTitle?: string;
  emptyHeading?: string;
  emptyMessage?: string;
  /** When set, a last "Status" column shows this value for every learner. */
  status?: string;
  /** When set, the on-screen table gets a name/LRN search and pages of this size; print and PDF keep every matching row. */
  pageSize?: number;
  /** Top-right line of the PDF and printed header; defaults to today's date. */
  dateLine?: string;
}) {
  const sections = [...new Set(learners.map((l) => l.section).filter((s): s is string => !!s))].sort();
  const [section, setSection] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  // The print copy is portaled into <body>, which only exists in the browser.
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const rows = learners.filter((l) => (section === "all" || l.section === section) && matchesLearnerSearch(l, searchQuery));
  const pageCount = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pageStart = pageSize ? (currentPage - 1) * pageSize : 0;
  const pageEnd = pageSize ? pageStart + pageSize : rows.length;
  const columns = status ? [...COLUMNS, "Status"] : COLUMNS;
  const cells = rows.map((l, i) => (status ? [...toCells(l, i), status] : toCells(l, i)));
  const males = rows.filter((l) => l.gender === "Male").length;
  const summary = `Male: ${males}    Female: ${rows.length - males}    Total: ${rows.length}`;
  const sectionLabel = (section === "all" ? sections : [section]).map((s) => `${gradeLevels[0]} - ${s}`).join(", ") || "—";
  const headerDate = dateLine ?? `Date: ${formatDatePH(new Date())}`;

  async function downloadPdf() {
    setGenerating(true);
    try {
      // Loaded on click so the PDF library stays out of the page's first load.
      const [{ jsPDF }, { autoTable }, { drawNotedBy, lastTableY }] = await Promise.all([import("jspdf"), import("jspdf-autotable"), import("@/lib/report-pdf")]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      const logo = await pngDataUrl(LOGO).catch(() => null);
      if (logo) doc.addImage(logo, "PNG", 40, 30, 50, 50);
      doc.setFont("helvetica", "bold").setFontSize(14).text(SCHOOL, width / 2, 50, { align: "center" });
      doc.setFont("helvetica", "normal").setFontSize(12).text(reportTitle, width / 2, 68, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Adviser: ${teacherName ?? "—"}`, 40, 104);
      doc.text(`Section: ${sectionLabel}`, 40, 118);
      doc.text(headerDate, width - 40, 104, { align: "right" });

      autoTable(doc, {
        startY: 130,
        head: [columns],
        body: cells,
        foot: [[{ content: summary, colSpan: columns.length }]],
        showFoot: "lastPage",
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [91, 6, 16], textColor: 255 },
        footStyles: { fillColor: [245, 245, 245], textColor: 30 },
        columnStyles: { 0: { halign: "center", cellWidth: 32 }, 3: { halign: "center" }, 5: { halign: "center" }, 7: { halign: "center" } },
        margin: { left: 40, right: 40, bottom: 40 },
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(8).text(`Page ${pageNumber}`, width - 40, height - 20, { align: "right" });
        },
      });
      drawNotedBy(doc, lastTableY(doc), 40);

      doc.save(`${reportTitle.toLowerCase().replace(/\s+/g, "-")}-${(section === "all" ? "all-sections" : section).toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("Failed to generate the learner list PDF:", err);
      toast.error("Couldn't make the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b0610] disabled:opacity-60";

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm shadow-gray-200/40 overflow-hidden">
        <div className="px-6 py-4 bg-[#5b0610] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">List of Learners</h2>
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md border border-white/20">
            {rows.length} Learner{rows.length !== 1 && "s"}
          </span>
        </div>

        <div className="border-b border-gray-300 bg-gray-50/60 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {sections.length > 1 ? (
            <Select
              value={section}
              onValueChange={(value) => {
                setSection(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-auto rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-800 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-xs [&_svg]:text-gray-400">
                <SelectValue>{section === "all" ? "All Sections" : section}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[180px]">
                <SelectGroup>
                  <SelectItem value="all" className="text-[12px] font-semibold">
                    All Sections
                  </SelectItem>
                  <SelectSeparator />
                  {sections.map((s) => (
                    <SelectItem key={s} value={s} className="text-[12px] font-semibold">
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-[12px] font-bold text-gray-800 uppercase tracking-widest">Section: {sectionLabel}</span>
          )}
          {pageSize && (
            <LearnerSearch
              searchQuery={searchQuery}
              setSearchQuery={(query) => {
                setSearchQuery(query);
                setPage(1);
              }}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={rows.length === 0}
              className={`${buttonClass} text-[#5b0610] border border-[#5b0610]/20 bg-white hover:bg-[#5b0610]/5`}
            >
              <Printer size={13} strokeWidth={2.4} />
              Print
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={rows.length === 0 || generating}
              className={`${buttonClass} text-white bg-[#5b0610] hover:bg-[#4a050d]`}
            >
              {generating ? <Loader2 size={13} strokeWidth={2.4} className="animate-spin" /> : <Download size={13} strokeWidth={2.4} />}
              Download PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              {learners.length > 0 ? (
                <p className="text-sm font-semibold text-gray-800">No learner matches &quot;{searchQuery.trim()}&quot;.</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800">{emptyHeading}</p>
                  <p className="text-xs text-gray-500 mt-1">{emptyMessage}</p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50/70">
                  {columns.map((c, i) => (
                    <th
                      key={c}
                      className={`whitespace-nowrap py-3 px-4 text-[12px] font-bold text-gray-700 uppercase tracking-[0.12em] ${i === 2 || i === 1 || i === 6 ? "text-left" : "text-center"}`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cells.slice(pageStart, pageEnd).map((row, r) => (
                  <tr key={rows[pageStart + r].learnerId} className="hover:bg-[#5b0610]/[0.025]">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`whitespace-nowrap py-2.5 px-4 text-[13px] tabular-nums ${i === 2 ? "font-semibold text-gray-900" : "text-gray-700"} ${i === 2 || i === 1 || i === 6 ? "text-left" : "text-center"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Blank rows keep a short page as tall as a full one, so the card doesn't jump when paging, filtering or searching. */}
                {pageSize && learners.length > pageSize &&
                  Array.from({ length: pageEnd - Math.min(pageEnd, rows.length) }, (_, i) => (
                    <tr key={`filler-${i}`} aria-hidden="true" className="!border-transparent">
                      <td colSpan={columns.length} className="py-2.5 px-4 text-[13px]">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <p className="text-[12px] text-gray-600 tabular-nums font-semibold whitespace-pre">{summary}</p>
        </div>
        {pageSize && (
          <Pagination
            shownOnPage={Math.min(pageEnd, rows.length) - pageStart}
            total={rows.length}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* The printed copy, laid out in points to match the downloaded PDF; only the print stylesheet in globals.css shows it. */}
      {isClient &&
        createPortal(
          <div className="print-root">
            <div className="relative min-h-[50pt]">
              {/* Eager, since a lazy image inside this hidden copy would never load before printing. */}
              <Image src={LOGO} alt="" width={50} height={50} loading="eager" className="absolute left-0 top-0 size-[50pt]" />
              <div className="pt-[10pt] text-center leading-tight">
                <p className="text-[14pt] font-bold">{SCHOOL}</p>
                <p className="mt-[3pt] text-[12pt]">{reportTitle}</p>
              </div>
            </div>
            <div className="mt-[16pt] flex justify-between text-[10pt] leading-[14pt]">
              <div>
                <p>Adviser: {teacherName ?? "—"}</p>
                <p>Section: {sectionLabel}</p>
              </div>
              <p>{headerDate}</p>
            </div>
            <table className="mt-[6pt] w-full border-collapse text-[9pt]">
              <thead>
                <tr>
                  {columns.map((c, i) => (
                    <th key={c} className={`border border-[#c8c8c8] bg-[#5b0610] p-[5pt] font-bold text-white ${PDF_CENTERED.has(i) ? "text-center" : "text-left"}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells.map((row, r) => (
                  <tr key={rows[r].learnerId} className="break-inside-avoid">
                    {row.map((cell, i) => (
                      <td key={i} className={`border border-[#c8c8c8] p-[5pt] ${PDF_CENTERED.has(i) ? "text-center" : "text-left"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border border-t-0 border-[#c8c8c8] bg-[#f5f5f5] p-[5pt] text-[9pt] font-bold whitespace-pre">{summary}</p>
            <NotedBy />
          </div>,
          document.body,
        )}
    </>
  );
}
