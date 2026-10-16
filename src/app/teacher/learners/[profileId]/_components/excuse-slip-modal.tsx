"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ModalShell } from "@/components/ui/modal-shell";

export interface AbsentDay {
  /** YYYY-MM-DD, what the API takes. */
  isoDate: string;
  /** What the teacher reads, e.g. "Mon, Oct 5, 2026". */
  label: string;
}

const MAX_REASON = 255;
const QUICK_REASONS = ["Sick", "Family emergency", "Bad weather", "Medical appointment"];

const field = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white ${err ? "border-red-400" : "border-gray-300"}`;

// The parent changes `key` each time it opens, so the form always starts empty.
export default function ExcuseSlipModal({
  open,
  onClose,
  learnerId,
  learnerName,
  absentDays,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  learnerId: number;
  learnerName: string;
  absentDays: AbsentDay[];
  /** For pages that load on the client (the classroom), which router.refresh() doesn't reach. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(absentDays[0]?.isoDate ?? "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/learners/${learnerId}/excuse-slip`, { method: "PUT", body: JSON.stringify({ date, reason }) });
      if (res.ok) {
        toast.success("Excuse slip logged.");
        onClose();
        onSaved?.();
        router.refresh();
      } else if (res.status === 422) {
        const { errors: found } = (await res.json()) as { errors: Record<string, string[]> };
        setErrors(Object.fromEntries(Object.entries(found).map(([key, messages]) => [key, messages[0]])));
      } else {
        toast.error("Couldn't log the excuse slip. Please try again.");
      }
    } catch (err) {
      console.error("Failed to log the excuse slip:", err);
      toast.error("Couldn't log the excuse slip. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Log Excuse Slip" subtitle={learnerName} headerId="excuse-slip-title" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="space-y-1.5">
          <label htmlFor="excuse-date" className="text-xs font-bold uppercase tracking-wider text-[#4a0e1c]">
            Day absent
          </label>
          <select id="excuse-date" value={date} onChange={(e) => setDate(e.target.value)} className={field(errors.date)}>
            {absentDays.map((day) => (
              <option key={day.isoDate} value={day.isoDate}>
                {day.label}
              </option>
            ))}
          </select>
          {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="excuse-reason" className="text-xs font-bold uppercase tracking-wider text-[#4a0e1c]">
            Reason on the slip
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setReason(quick)}
                className="rounded-full border border-[#d9d0a8] bg-[#eae4c9]/50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-[#eae4c9] cursor-pointer"
              >
                {quick}
              </button>
            ))}
          </div>
          <textarea
            id="excuse-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            rows={3}
            placeholder="Why was the learner absent?"
            className={`${field(errors.reason)} resize-none`}
          />
          <div className="flex justify-between text-xs">
            <span className="text-red-600">{errors.reason}</span>
            <span className="text-gray-400">
              {reason.length}/{MAX_REASON}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d050d] cursor-pointer disabled:cursor-wait disabled:opacity-70"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Excuse Slip
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
