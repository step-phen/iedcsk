"use client";

import { useState, type FormEvent } from "react";
import { PasswordField } from "@/app/teacher/_components/layout/change-password-form";
import { apiFetch } from "@/lib/api";

// Setting a new password proves the incoming teacher can sign in and retires the temporary one in the same step.
export default function AcceptHandoverForm({ fromName, sectionCount }: { fromName: string; sectionCount: number }) {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/me/handover/accept", {
        method: "POST",
        body: JSON.stringify({ newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }),
      });
      if (res.ok) {
        window.location.assign("/teacher");
        return;
      }
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, m[0]])));
      } else if (res.status === 409) {
        setFormError("This handover was cancelled or already accepted.");
      } else {
        setFormError("Could not accept the handover. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function logOut() {
    await apiFetch("/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-stone-900">Accept class handover</h1>
        <p className="mt-1 text-sm text-stone-600">
          {fromName} is handing over {sectionCount} {sectionCount === 1 ? "section" : "sections"} to you, with all learners and records. Set your own
          password to accept.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="newPassword"
          name="newPassword"
          labelText="New Password"
          autoComplete="new-password"
          error={fieldErrors.newPassword}
          hint="At least 8 characters, not the temporary password."
        />
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          labelText="Confirm New Password"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
        {formError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{formError}</p>}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={logOut} className="cursor-pointer rounded text-sm font-semibold text-gray-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#5b0610]">
            Log out
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-10 cursor-pointer rounded-lg bg-[#5b0610] px-6 text-sm font-bold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {pending ? "Accepting..." : "Accept Handover"}
          </button>
        </div>
      </form>
    </div>
  );
}
