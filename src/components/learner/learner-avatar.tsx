import Image from "next/image";
import { cn } from "@/lib/utils";

// The learner's uploaded photo, or their first initial when none was uploaded; size and colors come from className.
// Eager: every screen that shows it (picker, profile, game header) has it above the fold, and on the profile it is the LCP.
export function LearnerAvatar({
  photoUrl,
  firstName,
  className,
}: {
  photoUrl?: string | null;
  firstName: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold uppercase leading-none select-none",
        className,
      )}
    >
      {photoUrl ? <Image src={photoUrl} alt="" fill sizes="160px" loading="eager" className="object-cover" /> : firstName.charAt(0)}
    </span>
  );
}
