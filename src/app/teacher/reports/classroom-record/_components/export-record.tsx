"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { displaySchoolYear, useActiveSchoolYear } from "@/hooks/useActiveSchoolYear";
import { cn } from "@/lib/utils";
import { XLSX_TYPE, download, fileName, toCsv, toXlsx, type ExportMeta } from "./record-export";
import type { ClassroomRecord } from "./week-record";

const MENU_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none select-none data-[highlighted]:bg-gray-100";

/** Export menu beside Print: the same record the table shows, as .xlsx or .csv, saved on this device. */
export default function ExportRecord({
  record,
  meta,
}: {
  /** null when the current view has no table. */
  record: ClassroomRecord | null;
  meta: Omit<ExportMeta, "schoolYear">;
}) {
  const year = useActiveSchoolYear();
  const [busy, setBusy] = useState(false);
  // Waits for the school year so every file carries complete details, and for one file before the next.
  const disabled = !record || year === undefined || busy;

  const run = async (format: "xlsx" | "csv") => {
    if (!record || year === undefined || busy) return;
    setBusy(true);
    try {
      const full = { ...meta, schoolYear: year ? displaySchoolYear(year.name) : "—" };
      if (format === "xlsx") download(await toXlsx(record, full), XLSX_TYPE, fileName(full, "xlsx"));
      else download(toCsv(record, full), "text/csv;charset=utf-8", fileName(full, "csv"));
    } catch (error) {
      console.error("[ExportRecord]", error);
      toast.error("Could not create the file. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={disabled}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-sidebar/20 bg-white px-3 text-xs font-semibold text-sidebar outline-none transition-[background-color,transform] duration-100 ease-out hover:bg-sidebar/5 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-sidebar/30",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:active:scale-100 data-[popup-open]:bg-sidebar/5",
        )}
      >
        <Download size={14} strokeWidth={2.4} aria-hidden="true" />
        {busy ? "Exporting…" : "Export"}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup
            className={cn(
              "w-44 origin-[var(--transform-origin)] rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-lg outline-none",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            <Menu.Item onClick={() => void run("xlsx")} className={MENU_ITEM}>
              Excel (.xlsx)
            </Menu.Item>
            <Menu.Item onClick={() => void run("csv")} className={MENU_ITEM}>
              CSV (.csv)
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
