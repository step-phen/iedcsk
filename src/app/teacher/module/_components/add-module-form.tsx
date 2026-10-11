"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api";

const inp = (err?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#5b0610]/10 focus:border-[#5b0610] bg-white ${err ? "border-red-400" : "border-gray-400"}`;

type Domain = { domainId: number; domainName: string };

export type CreatedModule = {
  id: number;
  moduleName: string;
  scheduleDays: { day: string; startTime: string; endTime: string }[];
  domains: { id: number; name: string }[];
  lessons: [];
};

type FieldErrors = { moduleName?: string; domainIds?: string; newDomain?: string };

interface AddModuleFormProps {
  onClose: () => void;
  onCreated: (module: CreatedModule) => void;
}

export default function AddModuleForm({ onClose, onCreated }: AddModuleFormProps) {
  // undefined while loading, null when loading failed.
  const [domains, setDomains] = useState<Domain[] | null>();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/domains", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`GET /api/domains failed: ${res.status}`);
        return res.json();
      })
      .then((data: Domain[]) => setDomains(data))
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("[AddModuleForm]", error);
        setDomains(null);
      });
    return () => controller.abort();
  }, []);

  // onSubmit + fetch rather than a form action, so an API rejection leaves what the teacher typed and ticked in place.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setPending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const res = await apiFetch("/api/modules", {
        method: "POST",
        body: JSON.stringify({
          moduleName: formData.get("moduleName"),
          domainIds: formData.getAll("domainIds").map(Number),
          newDomain: formData.get("newDomain"),
        }),
      });
      if (res.ok) {
        toast.success("Module added!", { position: "top-center" });
        onCreated(await res.json());
        onClose();
        return;
      }
      if (res.status === 422) {
        const { errors } = (await res.json()) as { errors: Record<string, string[]> };
        const domainError = Object.entries(errors).find(([key]) => key.startsWith("domainIds"))?.[1][0];
        setFieldErrors({ moduleName: errors.moduleName?.[0], domainIds: domainError, newDomain: errors.newDomain?.[0] });
      } else {
        setFormError("Could not add the module. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Add Module"
      subtitle="A new subject for every section. Set its class time in Settings › Class Schedule."
      headerId="add-module-title"
      maxWidth="max-w-md"
      headerPadding="px-5 py-3"
      titleSize="text-base"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor="am-name" className="block text-xs font-bold text-gray-700 mb-1.5">
            Module Name <span className="text-red-500">*</span>
          </label>
          <input
            id="am-name"
            name="moduleName"
            required
            placeholder="e.g. Science"
            aria-invalid={!!fieldErrors.moduleName}
            className={inp(fieldErrors.moduleName)}
          />
          {fieldErrors.moduleName && <p className="text-xs text-red-500 mt-1">{fieldErrors.moduleName}</p>}
        </div>

        <fieldset aria-describedby="am-domains-hint">
          <legend className="block text-xs font-bold text-gray-700 mb-1.5">
            Domains <span className="text-red-500">*</span>
          </legend>
          <p id="am-domains-hint" className="text-xs text-gray-500 mb-2">
            Tick at least one, or add a new domain below.
          </p>
          {domains === undefined ? (
            <p className="text-sm text-gray-500">Loading domains…</p>
          ) : domains === null ? (
            <p className="text-sm text-red-500">Could not load domains. You can still add a new one below.</p>
          ) : (
            <div className="space-y-1.5">
              {domains.map((d) => (
                <label key={d.domainId} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-800">
                  <input type="checkbox" name="domainIds" value={d.domainId} className="size-4 accent-[#5b0610]" />
                  {d.domainName}
                </label>
              ))}
            </div>
          )}
          {fieldErrors.domainIds && <p className="text-xs text-red-500 mt-1">{fieldErrors.domainIds}</p>}
        </fieldset>

        <div>
          <label htmlFor="am-new-domain" className="block text-xs font-bold text-gray-700 mb-1.5">
            New Domain
          </label>
          <input
            id="am-new-domain"
            name="newDomain"
            placeholder="e.g. Science Discovery"
            aria-invalid={!!fieldErrors.newDomain}
            className={inp(fieldErrors.newDomain)}
          />
          {fieldErrors.newDomain && <p className="text-xs text-red-500 mt-1">{fieldErrors.newDomain}</p>}
        </div>

        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6 text-sm border-gray-400">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#5b0610] hover:bg-[#4d050d] text-white h-10 px-6 text-sm"
          >
            {pending ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
