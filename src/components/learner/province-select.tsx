"use client";

import { useMemo } from "react";
import { useProvinces } from "@/hooks/useProvinces";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProvinceSelectProps {
  /** Load the list only once the surrounding form is actually open. */
  enabled: boolean;
  /** province_id of the currently saved province, if any. */
  defaultValue?: number | null;
  /** Field error from the server action, keyed `provinceId`. */
  error?: string;
  /** The form's shared input class helper, so this matches its siblings. */
  inputClassName: (error?: string) => string;
}

/**
 * The province dropdown, backed by the `provinces` table.
 *
 * Submits `provinceId` — the address stores the foreign key, not the spelling.
 * Rendered from one component so the Add and Edit forms cannot drift into
 * offering different options or submitting different field names.
 *
 * Base UI rather than a native <select>, for one reason: the browser's own
 * popup anchors the SELECTED option over the closed box, so picking a province
 * far down 82 entries made the list open upward and run off the top of the
 * screen. That popup is drawn outside the page and no CSS can move it. A
 * portalled popup is positioned by us — see the two props on SelectContent.
 */
export default function ProvinceSelect({
  enabled,
  defaultValue,
  error,
  inputClassName,
}: ProvinceSelectProps) {
  const { provinces, loading, failed } = useProvinces(enabled);

  // Passing `items` is what lets <SelectValue /> show the province NAME with no
  // children of its own — without it the trigger renders the raw id.
  const items = useMemo(
    () =>
      provinces.map((province) => ({
        label: province.provinceName,
        value: String(province.provinceId),
      })),
    [provinces]
  );

  // A learner cannot be saved without a province, so a failed list must not be
  // a dead end — fall back to a plain number box rather than an empty dropdown
  // the teacher can never satisfy.
  if (failed) {
    return (
      <>
        <input
          id="provinceId"
          name="provinceId"
          inputMode="numeric"
          defaultValue={defaultValue ?? ""}
          aria-invalid={!!error}
          aria-describedby="provinceId-error"
          className={inputClassName(error)}
        />
        <p id="provinceId-error" className="text-xs text-red-500 mt-1">
          {error ?? "Could not load the province list. Reopen the form to retry."}
        </p>
      </>
    );
  }

  return (
    <>
      {/* `name` makes Base UI render the hidden input the server action reads
          out of FormData, so the action and its zod schema are unchanged. */}
      <Select
        name="provinceId"
        items={items}
        defaultValue={defaultValue != null ? String(defaultValue) : null}
      >
        <SelectTrigger
          id="provinceId"
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={error ? "provinceId-error" : undefined}
          // h-auto undoes the trigger's own fixed height so this lines up with
          // the plain inputs beside it; the rest of inp() wins via tw-merge.
          className={inputClassName(error) + " data-[size=default]:h-auto"}
        >
          <SelectValue placeholder={loading ? "Loading provinces…" : "Select province"} />
        </SelectTrigger>
        {/* Both props are needed to keep this opening downward:
            alignItemWithTrigger={false} stops the popup stacking over the
            trigger (the native behaviour being replaced), and
            collisionAvoidance side:"none" stops it flipping upward when the
            field sits low in the viewport — which is exactly where this one
            sits. The popup's own max-h-(--available-height) caps it to the
            room below and scrolls, so it never runs off the bottom. */}
        <SelectContent
          side="bottom"
          align="start"
          alignItemWithTrigger={false}
          collisionAvoidance={{ side: "none" }}
        >
          <SelectGroup>
            <SelectLabel>Provinces</SelectLabel>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && (
        <p id="provinceId-error" className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </>
  );
}
