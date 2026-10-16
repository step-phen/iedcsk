"use client";

import { useState } from "react";
import { ArrowRight, GraduationCap, Filter, X } from "lucide-react";
import PageHeader from "@/app/teacher/_components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PromotedBatch = {
  id: number;
  yearPromoted: string;
  learnerCount: number;
  datePromoted: string;
  adviser: string;
};

// ponytail: no promotion history endpoint yet, wire this to the API once it exists.
const promotedBatches: PromotedBatch[] = [];

const schoolYears = promotedBatches.map((b) => b.yearPromoted);

export default function PromotedLearnersPage() {
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const filtered =
    selectedYear === "all"
      ? promotedBatches
      : promotedBatches.filter((b) => b.yearPromoted === selectedYear);

  const isFiltered = selectedYear !== "all";

  return (
    <div className="space-y-4">
      <PageHeader className="mb-5" />

      {/* Hero header — UNCHANGED */}
      <div className="relative overflow-hidden rounded-2xl bg-[#5b0610] p-5 md:p-6 shadow-lg shadow-[#5b0610]/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#a05465] rounded-full blur-3xl opacity-20 mix-blend-screen" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-[#3d0208] rounded-full blur-3xl opacity-40 mix-blend-multiply" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-white hidden sm:flex">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#e3b8bc] tracking-[0.15em] uppercase mb-1">
              Report Center
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Promotion History
            </h1>
            <p className="text-xs md:text-[13px] text-white/80 mt-1 max-w-xl font-medium">
              Each school year&apos;s batch of learners promoted to Grade 1.
            </p>
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm shadow-gray-200/40 overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 bg-[#5b0610] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Promotion Records
            </h2>
          </div>
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md border border-white/20">
            {filtered.length} School Year{filtered.length !== 1 && "s"}
          </span>
        </div>

        {/* Filter row */}
        <div className="border-b border-gray-300 bg-gray-50/60">
          <div className="px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Filter size={13} className="text-gray-600" strokeWidth={2.4} />
              <span className="text-[12px] font-bold text-gray-800 uppercase tracking-widest">
                Filter by Year
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isFiltered && (
                <button
                  type="button"
                  onClick={() => setSelectedYear("all")}
                  className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-[12px] font-bold text-[#5b0610] bg-[#5b0610]/8 border border-[#5b0610]/15 hover:bg-[#5b0610]/14 transition-colors"
                >
                  {selectedYear}
                  <X size={11} strokeWidth={3} />
                </button>
              )}
              <Select
                value={selectedYear}
                onValueChange={(value) => setSelectedYear(value ?? "all")}
              >
                <SelectTrigger className="h-auto rounded-lg px-3 py-1.5 text-[12px] font-bold text-gray-800 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-xs [&_svg]:text-gray-400">
                  <SelectValue placeholder="Select year">
                    {isFiltered ? "Change" : "Select year"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[180px]">
                  <SelectGroup>
                    <SelectItem value="all" className="text-[12px] font-semibold">
                      All School Years
                    </SelectItem>
                    <SelectSeparator />
                    {schoolYears.map((year) => (
                      <SelectItem key={year} value={year} className="text-[12px] font-semibold">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-gray-600">
                {isFiltered
                  ? "No records match the selected filter."
                  : "No promotion records yet."}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={() => setSelectedYear("all")}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5b0610] hover:underline"
                >
                  Clear filter
                  <ArrowRight size={12} strokeWidth={2.8} />
                </button>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">
                Promotion records by school year, newest first.
              </caption>
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50/70">
                  <th className="whitespace-nowrap py-3 pl-6 pr-4 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em] text-left">
                    School Year
                  </th>
                  <th className="whitespace-nowrap py-3 pr-4 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em] text-center">
                    No. of Learners
                  </th>
                  <th className="whitespace-nowrap py-3 pr-4 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em] text-center">
                    Date Promoted
                  </th>
                  <th className="py-3 pr-4 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em] text-left">
                    Adviser
                  </th>
                  <th className="whitespace-nowrap py-3 pr-6 text-[13px] font-bold text-gray-700 uppercase tracking-[0.14em] text-center">
                    Record
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((batch, i) => {
                  const isLatest = batch.id === promotedBatches[0].id;
                  const isLast = i === filtered.length - 1;

                  return (
                    <tr
                      key={batch.id}
                      className="group hover:bg-[#5b0610]/[0.025] transition-colors duration-150"
                    >
                      {/* Year — timeline spine */}
                      <td className="relative whitespace-nowrap py-4 pl-6 pr-4 align-middle">
                        <span
                          aria-hidden
                          className={`absolute left-[34px] w-px bg-gray-100 ${isLatest ? "top-1/2 bottom-0" : isLast ? "top-0 bottom-1/2" : "inset-y-0"}`}
                        />
                        <span className="relative flex items-center gap-3.5">
                          <span
                            aria-hidden
                            className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
                          >
                            {isLatest && (
                              <span className="absolute inset-0 rounded-full bg-[#5b0610]/25 animate-ping" />
                            )}
                            <span
                              className={`relative h-2 w-2 rounded-full ${isLatest ? "bg-[#5b0610] shadow-sm shadow-[#5b0610]/40" : "bg-gray-300"}`}
                            />
                          </span>
                          <span className="flex flex-col">
                            <span className="text-[15px] font-bold text-gray-900 tabular-nums tracking-tight leading-tight">
                              {batch.yearPromoted}
                            </span>
                            {isLatest && (
                              <span className="mt-0.5 self-start text-[10px] font-bold uppercase tracking-[0.14em] text-[#5b0610] bg-[#5b0610]/10 px-1.5 py-px rounded">
                                Latest
                              </span>
                            )}
                          </span>
                        </span>
                      </td>

                      {/* Learner count — centered */}
                      <td className="whitespace-nowrap py-4 pr-4 text-[15px] font-bold text-gray-900 tabular-nums text-center">
                        {batch.learnerCount}
                      </td>

                      {/* Date — centered */}
                      <td className="whitespace-nowrap py-4 pr-4 text-[13px] text-gray-700 tabular-nums font-semibold text-center">
                        {batch.datePromoted}
                      </td>

                      {/* Adviser */}
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-6 w-6 shrink-0 rounded-full bg-[#5b0610]/8 flex items-center justify-center text-[10px] font-bold text-[#5b0610] uppercase"
                          >
                            {batch.adviser
                              .split(",")[0]
                              .trim()
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                          <span className="text-[13px] text-gray-900 font-semibold leading-tight">
                            {batch.adviser}
                          </span>
                        </span>
                      </td>

                      {/* Action — centered */}
                      <td className="whitespace-nowrap py-4 pr-6 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#5b0610] border border-[#5b0610]/12 bg-[#5b0610]/[0.03] hover:bg-[#5b0610]/10 hover:border-[#5b0610]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b0610] transition-all duration-150"
                        >
                          View
                          <ArrowRight
                            size={12}
                            strokeWidth={2.8}
                            className="motion-safe:transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[12px] text-gray-600 font-semibold">
            {isFiltered
              ? `Filtered to ${selectedYear}`
              : "Sorted by most recent school year"}
          </p>
          <p className="text-[12px] text-gray-600 tabular-nums font-semibold">
            {filtered.reduce((s, b) => s + b.learnerCount, 0)} learner
            {filtered.reduce((s, b) => s + b.learnerCount, 0) !== 1 && "s"}
            {isFiltered
              ? " in 1 school year"
              : ` across ${filtered.length} school years`}
          </p>
        </div>
      </div>
    </div>
  );
}
