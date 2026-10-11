"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { apiFetch } from "@/lib/api";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] shadow-xs bg-white ${err ? "border-red-400" : "border-gray-400"}`;

const label = "block text-xs font-bold text-gray-700 mb-1.5";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 cursor-pointer rounded-lg bg-[#5b0610] px-6 text-sm font-bold text-white outline-none transition-colors hover:bg-[#4d050d] focus-visible:ring-2 focus-visible:ring-[#5b0610] focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export default function AccountDetailsForm({
  teacherName,
  username,
}: {
  teacherName: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // onSubmit + fetch rather than a form action, so an API rejection keeps what was typed.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/me", {
        method: "PUT",
        body: JSON.stringify({ teacherName: form.get("teacherName"), username: form.get("username") }),
      });
      if (res.ok) {
        setFieldErrors({});
        toast.success("Account details updated!");
        // Refreshes the sidebar, which shows the name and username.
        router.refresh();
      } else if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        setFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, m[0]])));
      } else {
        setFormError("Could not save your details. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
      <div>
        <label htmlFor="teacherName" className={label}>
          Teacher Name
        </label>
        <input
          id="teacherName"
          name="teacherName"
          defaultValue={teacherName}
          placeholder="e.g. Maria C. Santos"
          className={inp(fieldErrors.teacherName)}
        />
        {fieldErrors.teacherName && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.teacherName}</p>
        )}
      </div>
      <div>
        <label htmlFor="username" className={label}>
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={username}
          className={inp(fieldErrors.username)}
        />
        {fieldErrors.username ? (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.username}</p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-500">
            Used to sign in. Must stay unique.
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
  );
}
