import { Loader2 } from "lucide-react";

/** The one loading indicator for teacher pages: a centered maroon spinner. */
export function PageLoader() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-1 items-center justify-center py-24 text-[#5b0610]">
      <Loader2 size={36} className="animate-spin" />
    </div>
  );
}
