"use client";

import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Check, Clock, Download, FileText, Loader2, X } from "lucide-react";
import { downloadSf2, type Sf2Learner } from "./export-sf2";
import ExcuseSlipModal, { type AbsentDay } from "./excuse-slip-modal";

export interface AttendanceRow {
  /** YYYY-MM-DD, as the API stores it. */
  isoDate: string;
  date: string;
  day: string;
  status: string;
  /** The session's own start time, formatted — stands in for a per-learner
   *  check-in timestamp, which this app doesn't record. */
  time: string;
  /** The reason on the excuse slip, for an excused day. */
  reason: string | null;
}

interface AttendanceTabProps {
  data: AttendanceRow[];
  learner: Sf2Learner;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function AttendanceTab({ data, learner }: AttendanceTabProps) {
  const [exporting, setExporting] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  // A new key each time the modal opens, so its form starts empty.
  const [slipKey, setSlipKey] = useState(0);
  const recordsByDay = useMemo(() => {
    const map = new Map<string, { status: string; time: string; reason: string | null }>();
    data.forEach((row) => {
      const parsed = new Date(row.date);
      if (!isNaN(parsed.getTime())) {
        map.set(dayKey(parsed), { status: row.status, time: row.time, reason: row.reason });
      }
    });
    return map;
  }, [data]);

  const latestDate = useMemo(() => {
    let latest: Date | null = null;
    data.forEach((row) => {
      const parsed = new Date(row.date);
      if (!isNaN(parsed.getTime()) && (!latest || parsed > latest)) {
        latest = parsed;
      }
    });
    return latest ?? new Date();
  }, [data]);

  const [viewDate, setViewDate] = useState(
    () => new Date(latestDate.getFullYear(), latestDate.getMonth(), 1),
  );

  // Ascending (Aug -> Nov, not Nov -> Aug) so the month pills read left-to-right.
  const availableMonths = useMemo(() => {
    const seen = new Map<string, Date>();
    data.forEach((row) => {
      const parsed = new Date(row.date);
      if (isNaN(parsed.getTime())) return;
      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
      if (!seen.has(key)) {
        seen.set(key, new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [data]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  // Calendar starts Monday, but getDay() is Sunday-first — shift it back.
  const startOffset = (startWeekday + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;
  const isWeekend = (day: number) => {
    const dow = new Date(year, month, day).getDay();
    return dow === 0 || dow === 6;
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long" });

  const statusList = Array.from(recordsByDay.entries()).filter(([key]) => {
    const [y, m] = key.split("-").map(Number);
    return y === year && m === month;
  });
  const presentCount = statusList.filter(([, r]) => r.status === "Present").length;
  const lateCount = statusList.filter(([, r]) => r.status === "Late").length;
  const absentCount = statusList.filter(([, r]) => r.status === "Absent").length;
  const excusedCount = statusList.filter(([, r]) => r.status === "Excused").length;
  // An excused day does not count against the learner, so it leaves the rate's total.
  const totalRecorded = statusList.length - excusedCount;
  const attendanceRate = totalRecorded > 0 ? (presentCount / totalRecorded) * 100 : 0;

  // Every absence on record can still get an excuse slip, newest first.
  const absentDays: AbsentDay[] = data
    .filter((row) => row.status === "Absent")
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .map((row) => ({ isoDate: row.isoDate, label: `${row.day}, ${row.date}` }));

  // The month on screen, as an SF-2 PDF with one row per recorded day.
  async function exportSf2() {
    const rows = data
      .filter((row) => {
        const d = new Date(row.date);
        return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (rows.length === 0) {
      toast.error(`No attendance recorded for ${monthLabel} ${year}.`);
      return;
    }
    setExporting(true);
    try {
      await downloadSf2({
        learner,
        monthLabel: `${monthLabel} ${year}`,
        rows,
        summary: { present: presentCount, absent: absentCount, late: lateCount, rate: attendanceRate },
      });
    } catch (err) {
      console.error("Failed to generate the SF-2 PDF:", err);
      toast.error("Couldn't make the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#5b0610]" />
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 tracking-tight leading-tight">
              Monthly Attendance Record
            </h2>
            <p className="text-xs text-gray-500">
              Daily Roll-Call Ledger
            </p>
          </div>
        </div>

        {/* Month pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {availableMonths.length > 0 ? (
            availableMonths.map((m) => {
              const isActive = m.getFullYear() === year && m.getMonth() === month;
              return (
                <button
                  key={`${m.getFullYear()}-${m.getMonth()}`}
                  onClick={() => setViewDate(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#5b0610] text-white"
                      : "bg-[#eae4c9]/60 text-gray-700 hover:bg-[#eae4c9]"
                  }`}
                >
                  {m.toLocaleDateString("en-US", { month: "long" })}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-gray-400 italic">No records yet</span>
          )}
        </div>
      </div>

      {/* ─── Summary banner ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
            <Check className="w-3.5 h-3.5 text-emerald-700" strokeWidth={3} />
          </span>
          <span className="text-sm font-bold text-gray-900">
            {presentCount} / {totalRecorded} Days Present
          </span>
          <span className="text-xs font-semibold text-gray-500">
            ({attendanceRate.toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {absentCount} Absent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {lateCount} Tardy / Late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            {excusedCount} Excused
          </span>
        </div>
      </div>

      {/* ─── Calendar + stats sidebar ─── */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;

              const record = recordsByDay.get(`${year}-${month}-${day}`);
              const todayFlag = isToday(day);
              const weekend = isWeekend(day);

              let cellClass =
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl border min-h-[64px] px-1 py-2 text-[13px] font-semibold transition-all ";

              if (weekend) {
                cellClass += "bg-gray-50 border-gray-200 text-gray-300 ";
              } else if (record?.status === "Present") {
                cellClass += "bg-[#eae4c9]/40 border-[#d9d0a8] text-gray-800 ";
              } else if (record?.status === "Late") {
                cellClass += "bg-amber-50 text-amber-800 border-amber-200 ";
              } else if (record?.status === "Absent") {
                cellClass += "bg-red-50 text-red-700 border-red-200 ";
              } else if (record?.status === "Excused") {
                cellClass += "bg-sky-50 text-sky-800 border-sky-200 ";
              } else {
                cellClass += "bg-[#eae4c9]/20 border-[#eae4c9] text-gray-700 ";
              }

              if (todayFlag) cellClass += "ring-2 ring-[#5b0610] ring-offset-1 ";

              return (
                <div key={day} className={cellClass} title={record?.status === "Excused" ? (record.reason ?? "Excused") : undefined}>
                  <span className="leading-none text-[11px] text-gray-500 self-start">{day}</span>
                  {weekend ? (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-gray-300 mt-1.5">
                      Weekend
                    </span>
                  ) : record?.status === "Present" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5" strokeWidth={3} />
                      <span className="text-[10px] font-semibold text-gray-500">{record.time}</span>
                    </>
                  ) : record?.status === "Late" ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5" strokeWidth={3} />
                      <span className="text-[10px] font-semibold text-amber-700">{record.time}</span>
                    </>
                  ) : record?.status === "Absent" ? (
                    <>
                      <X className="w-3.5 h-3.5 text-red-500 mt-0.5" strokeWidth={3} />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-red-600">Absent</span>
                    </>
                  ) : record?.status === "Excused" ? (
                    <>
                      <FileText className="w-3.5 h-3.5 text-sky-600 mt-0.5" strokeWidth={2.5} />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-sky-700">Excused</span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats card */}
        <div className="lg:w-52 shrink-0 flex flex-col gap-2.5 rounded-xl bg-[#eae4c9]/50 p-3">
          <Stat label="Total Days Present" value={String(presentCount)} valueClass="text-gray-900" />
          <Stat label="Total Days Absent" value={String(absentCount)} valueClass="text-red-600" />
          <Stat label="Total Excused" value={String(excusedCount)} valueClass="text-sky-700" />
          <Stat label="Total Tardy / Late" value={String(lateCount)} valueClass="text-amber-700" />
          <Stat
            label="Attendance Rate"
            value={`${attendanceRate.toFixed(1)}%`}
            valueClass="text-[#5b0610]"
          />

          <div className="flex flex-col gap-2 pt-2 border-t border-gray-300/60">
            <button
              onClick={() => {
                setSlipKey((k) => k + 1);
                setSlipOpen(true);
              }}
              disabled={absentDays.length === 0}
              title={absentDays.length === 0 ? "No absences to excuse" : "Excuse one of this learner's absences"}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              Log Excuse Slip
            </button>
            <button
              onClick={exportSf2}
              disabled={exporting}
              title={`Download ${monthLabel} ${year} attendance as a PDF`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#5b0610] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4d050d] cursor-pointer disabled:cursor-wait disabled:opacity-70"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export SF-2
            </button>
          </div>
        </div>
      </div>
      <ExcuseSlipModal
        key={slipKey}
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        learnerId={learner.id}
        learnerName={learner.name}
        absentDays={absentDays}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
