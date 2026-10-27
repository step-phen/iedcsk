"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PasswordField } from "@/app/teacher/_components/layout/change-password-form";
import { fieldClass } from "@/app/teacher/_components/layout/settings-modal";
import { apiFetch } from "@/lib/api";

type Outgoing = { toName: string; toUsername: string; createdAt: string };

// Settings tab where the outgoing teacher creates the incoming teacher's account; nothing moves until that teacher accepts.
export default function HandoverPanel() {
  const [outgoing, setOutgoing] = useState<Outgoing | null>();
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    () =>
      apiFetch("/api/me/handover")
      .then((res) => {
        if (!res.ok) throw new Error(`GET /api/me/handover failed: ${res.status}`);
        return res.json();
      })
      .then((data: { outgoing: Outgoing | null }) => setOutgoing(data.outgoing))
      .catch((error) => {
        console.error("[HandoverPanel]", error);
        setFailed(true);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-stone-900">Hand Over Class</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Pass all your sections, learners and records to the teacher taking over. You keep full access until they sign in and accept.
        </p>
      </div>
      {failed ? (
        <p className="text-sm text-red-500">Could not load the handover. Please try again.</p>
      ) : outgoing === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : outgoing ? (
        <PendingHandover outgoing={outgoing} onCancelled={() => setOutgoing(null)} />
      ) : (
        <StartHandoverForm onStarted={() => void load()} />
      )}
    </div>
  );
}

function PendingHandover({ outgoing, onCancelled }: { outgoing: Outgoing; onCancelled: () => void }) {
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    setCancelling(true);
    try {
      const res = await apiFetch("/api/me/handover/cancel", { method: "POST" });
      // 409: the incoming teacher accepted first, so this account is already retired.
      if (res.status === 409) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- account retired; full reload clears its client state
        window.location.assign("/login");
        return;
      }
      if (!res.ok) throw new Error(`POST cancel failed: ${res.status}`);
      toast.success("Handover cancelled.");
      onCancelled();
    } catch (error) {
      console.error("[HandoverPanel]", error);
      toast.error("Could not cancel the handover. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-gray-800">
        Waiting for <span className="font-semibold">{outgoing.toName}</span> (@{outgoing.toUsername}) to sign in with the temporary password and accept.
        You keep full access until then; once they accept, this account is signed out and closed.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={cancel}
          disabled={cancelling}
          className="h-9.5 cursor-pointer rounded-lg border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-700 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-sidebar/40 disabled:opacity-60"
        >
          {cancelling ? "Cancelling..." : "Cancel Handover"}
        </button>
      </div>
    </div>
  );
}

function StartHandoverForm({ onStarted }: { onStarted: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // The dialog confirms first; the form only sends once the teacher agrees.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConfirming(true);
  }

  async function send() {
    const form = new FormData(formRef.current ?? undefined);
    setPending(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/me/handover", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(["teacherName", "username", "password", "confirmPassword", "currentPassword"].map((k) => [k, form.get(k)]))),
      });
      if (res.ok) {
        toast.success("Handover started. Give the new teacher their username and temporary password.");
        onStarted();
      } else if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, m[0]])));
      } else {
        setFormError("Could not start the handover. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  const textField = (field: string, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <label htmlFor={`handover-${field}`} className="block text-xs font-bold text-gray-700">
        {label}
      </label>
      <input
        id={`handover-${field}`}
        name={field}
        required
        placeholder={placeholder}
        aria-invalid={!!fieldErrors[field]}
        aria-describedby={fieldErrors[field] ? `handover-${field}-error` : undefined}
        className={fieldClass(fieldErrors[field])}
      />
      {fieldErrors[field] && (
        <p id={`handover-${field}-error`} className="text-xs text-red-500">
          {fieldErrors[field]}
        </p>
      )}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {textField("teacherName", "New Teacher's Name", "e.g. Maria Santos")}
        {textField("username", "Their Username", "e.g. msantos")}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField id="handover-password" name="password" labelText="Temporary Password" autoComplete="new-password" error={fieldErrors.password} hint="At least 8 characters. They will replace it." />
        <PasswordField id="handover-confirmPassword" name="confirmPassword" labelText="Confirm Temporary Password" autoComplete="new-password" error={fieldErrors.confirmPassword} />
      </div>
      <PasswordField id="handover-currentPassword" name="currentPassword" labelText="Your Current Password" autoComplete="current-password" error={fieldErrors.currentPassword} />
      {formError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{formError}</p>}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-10 cursor-pointer rounded-lg bg-[#5b0610] px-6 text-sm font-bold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Hand Over Class
        </button>
      </div>

      <AlertDialog open={confirming} onOpenChange={(open) => !open && !pending && setConfirming(false)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hand over your class?</AlertDialogTitle>
            <AlertDialogDescription>
              All your sections, learners and records will move to the new teacher once they sign in and accept. This account will then be signed out
              and can no longer sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={send}>
              {pending ? "Starting..." : "Start Handover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
