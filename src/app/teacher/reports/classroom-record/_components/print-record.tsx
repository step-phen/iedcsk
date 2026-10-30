"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Printer } from "lucide-react";
import { LOGO, NotedBy, SCHOOL } from "@/app/teacher/reports/learner-list/_components/learner-list-report";
import { formatDatePH } from "@/lib/datetime";

const subscribeNoop = () => () => {};

/** Print button plus the landscape copy that only the print stylesheet in globals.css shows. */
export default function PrintRecord({
  title = "Classroom Record",
  details,
  children,
}: {
  /** The line under the school name, e.g. "Classroom Record · Week 3". */
  title?: string;
  /** Lines under the title, e.g. "Section: Kindergarten - Joy". */
  details: string[];
  children: React.ReactNode;
}) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  return (
    <>
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-sidebar/20 bg-white px-3 text-xs font-semibold text-sidebar outline-none transition-[background-color,transform] duration-100 ease-out hover:bg-sidebar/5 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-sidebar/30"
      >
        <Printer size={14} strokeWidth={2.4} aria-hidden="true" />
        Print
      </button>

      {isClient &&
        createPortal(
          <div className="print-root print-landscape">
            <div className="relative min-h-[50pt]">
              {/* Eager, since a lazy image inside this hidden copy would never load before printing. */}
              <Image src={LOGO} alt="" width={50} height={50} loading="eager" className="absolute left-0 top-0 size-[50pt]" />
              <div className="pt-[10pt] text-center leading-tight">
                <p className="text-[14pt] font-bold">{SCHOOL}</p>
                <p className="mt-[3pt] text-[12pt]">{title}</p>
              </div>
            </div>
            <div className="mt-[16pt] mb-[6pt] flex justify-between text-[10pt] leading-[14pt]">
              <div>
                {details.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p>Date: {formatDatePH(new Date())}</p>
            </div>
            {children}
            <NotedBy />
          </div>,
          document.body,
        )}
    </>
  );
}
