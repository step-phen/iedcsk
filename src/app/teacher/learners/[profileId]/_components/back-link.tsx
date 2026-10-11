import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shared "back to the list" control for this route — used by the profile page's
 * tab row and by not-found.tsx, which previously carried two different styles
 * for the same label and destination.
 *
 * Deliberately a Link, not a Button: it navigates, so it has to stay an anchor
 * for middle-click, open-in-new-tab and screen readers.
 */
export default function BackLink({
  href = "/teacher/learners",
  label = "Back to Learners",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#5b0610] hover:underline"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
