"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white ${err ? "border-red-400" : "border-gray-400"}`;

const label = "block text-xs font-bold text-gray-700 mb-1.5";

// Own visibility state per field so revealing the new password doesn't also
// reveal the confirm/current fields.
export function PasswordField({
  id,
  name,
  labelText,
  autoComplete,
  error,
  hint,
  value,
  onValueChange,
}: {
  id: string;
  name: string;
  labelText: string;
  autoComplete: string;
  error?: string;
  /** Static guidance shown when there's no error yet, e.g. a length rule. */
  hint?: string;
  /** Only passed for fields the parent needs to read live (match checking). */
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = `${id}-hint`;

  return (
    <div>
      <label htmlFor={id} className={label}>
        {labelText}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={inp(error)}
          value={value}
          onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined}
          aria-invalid={!!error}
          aria-describedby={error || hint ? hintId : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${labelText.toLowerCase()}` : `Show ${labelText.toLowerCase()}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg text-gray-400 outline-none transition-colors hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-[#5b0610]/40"
        >
          {visible ? <EyeOff size={16} strokeWidth={2.2} /> : <Eye size={16} strokeWidth={2.2} />}
        </button>
      </div>
      {error ? (
        <p id={hintId} className="text-xs text-red-500 mt-1">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-gray-500 mt-1">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 cursor-pointer rounded-lg bg-[#5b0610] px-6 text-sm font-bold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {pending ? "Updating..." : "Update Password"}
    </button>
  );
}

export default function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Tracked (not just the other, uncontrolled fields) so Confirm can show a
  // live match indicator instead of only surfacing the mismatch after submit.
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const passwordsMatch = confirmValue.length > 0 && newPasswordValue === confirmValue;

  // onSubmit + fetch rather than a form action, so an API rejection keeps what was typed.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/me/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
          confirmPassword: form.get("confirmPassword"),
        }),
      });
      if (res.ok) {
        setFieldErrors({});
        toast.success("Password updated successfully!");
        formRef.current?.reset();
        setNewPasswordValue("");
        setConfirmValue("");
      } else if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, m[0]])));
      } else {
        setFormError("Could not update your password. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-stone-900">Change Password</h3>
        <p className="text-xs text-stone-500 mt-0.5">Use at least 8 characters that you don&apos;t use elsewhere.</p>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="currentPassword"
          name="currentPassword"
          labelText="Current Password"
          autoComplete="current-password"
          error={fieldErrors.currentPassword}
        />
        <PasswordField
          id="newPassword"
          name="newPassword"
          labelText="New Password"
          autoComplete="new-password"
          error={fieldErrors.newPassword}
          hint="At least 8 characters."
          value={newPasswordValue}
          onValueChange={setNewPasswordValue}
        />
        <div>
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            labelText="Confirm New Password"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            value={confirmValue}
            onValueChange={setConfirmValue}
          />
          {confirmValue.length > 0 && !fieldErrors.confirmPassword && (
            <p
              aria-live="polite"
              className={cn(
                "flex items-center gap-1 text-xs mt-1",
                passwordsMatch ? "text-emerald-600" : "text-gray-500",
              )}
            >
              {passwordsMatch ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <X size={12} strokeWidth={3} />
              )}
              {passwordsMatch ? "Passwords match" : "Doesn't match yet"}
            </p>
          )}
        </div>
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {formError}
          </p>
        )}
        <div className="flex justify-end pt-1">
          <SubmitButton pending={pending} />
        </div>
      </form>
    </div>
  );
}
