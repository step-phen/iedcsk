"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { AlertTriangle, Loader2, UserRoundX } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { todayDatePH } from "@/lib/datetime";
import { ModalShell } from "@/components/ui/modal-shell";
import { invalidateSections } from "@/hooks/useSections";

const MAX_REASON = 255;
const QUICK_REASONS = ["Transferred to another school", "Family moved away", "Health reasons", "Family decision"];

const field = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white ${err ? "border-red-400" : "border-gray-300"}`;
const label = "text-xs font-bold uppercase tracking-wider text-[#4a0e1c]";

// The profile header's Withdraw button with its confirmation modal.
export default function WithdrawButton({ learnerId, learnerName, schoolYear }: { learnerId: number; learnerName: string; schoolYear: string | null }) {
  const [open, setOpen] = useState(false);
  // A new key each time the modal opens, so its form starts over.
  const [key, setKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setKey((k) => k + 1);
          setOpen(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <UserRoundX className="h-3.5 w-3.5" />
        Withdraw
      </button>
      <WithdrawModal key={key} open={open} onClose={() => setOpen(false)} learnerId={learnerId} learnerName={learnerName} schoolYear={schoolYear} />
    </>
  );
}

function WithdrawModal({
  open,
  onClose,
  learnerId,
  learnerName,
  schoolYear,
}: {
  open: boolean;
  onClose: () => void;
  learnerId: number;
  learnerName: string;
  schoolYear: string | null;
}) {
  const router = useRouter();
  const today = todayDatePH().toISOString().slice(0, 10);
  const [withdrawnOn, setWithdrawnOn] = useState(today);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const year = schoolYear ? `SY ${schoolYear}` : "this school year";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await apiFetch(`/api/learners/${learnerId}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ withdrawnOn, reason: reason.trim() || null }),
      });
      if (res.ok) {
        toast.success(`${learnerName} is withdrawn from ${year}.`);
        invalidateSections();
        onClose();
        router.refresh();
        return;
      }
      if (res.status === 422) {
        const { errors: found } = (await res.json()) as { errors: Record<string, string[]> };
        setErrors(Object.fromEntries(Object.entries(found).map(([key, messages]) => [key, messages[0]])));
      } else {
        toast.error("Couldn't withdraw the learner. Please try again.");
      }
    } catch (err) {
      console.error("Failed to withdraw the learner:", err);
      toast.error("Couldn't withdraw the learner. Please try again.");
    }
    setSaving(false);
  }

  return (
    <ModalShell open={open} onClose={saving ? () => {} : onClose} title="Withdraw Learner" subtitle={learnerName} headerId="withdraw-title" maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4 p-5">
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          {learnerName} leaves your class list for {year}. Their profile, attendance, ratings and reports are kept, and they can be
          re-enrolled in a later school year.
        </p>

        {errors.learner && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {errors.learner}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="withdrawn-on" className={label}>
            Last day in class
          </label>
          <input
            id="withdrawn-on"
            type="date"
            required
            value={withdrawnOn}
            max={today}
            onChange={(e) => setWithdrawnOn(e.target.value)}
            className={field(errors.withdrawnOn)}
          />
          {errors.withdrawnOn && <p className="text-xs text-red-600">{errors.withdrawnOn}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="withdrawal-reason" className={label}>
            Reason <span className="font-medium normal-case tracking-normal text-gray-500">(optional)</span>
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
            id="withdrawal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            rows={3}
            placeholder="Why is the learner leaving?"
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
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d050d] cursor-pointer disabled:cursor-wait disabled:opacity-70"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Withdrawing…" : "Confirm Withdrawal"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
