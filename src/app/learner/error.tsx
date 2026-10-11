"use client";

import { useEffect } from "react";

/**
 * Error screen for the learner (child-facing) routes.
 *
 * Design constraints: kindergartners mostly can't read yet, so this leans on
 * a large picture, four short words, and a single oversized touch target.
 * No stack trace, no error text, no digest — none of it means anything to a
 * five-year-old, and the message can leak internals.
 */
export default function LearnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[learner] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fef9ed] px-6 py-10 text-center">
      <div className="w-full max-w-sm rounded-3xl border-4 border-[#f2c94c] bg-white p-8 shadow-2xl">
        <span className="block text-8xl leading-none" role="img" aria-label="Oops">
          🙈
        </span>

        <h1 className="mt-5 font-chewy text-4xl text-[#5b3a1a]">Oops!</h1>
        <p className="mt-2 font-baloo2 text-xl text-gray-600">
          Let&apos;s try again.
        </p>

        <button
          onClick={reset}
          className="mt-7 w-full rounded-full bg-yellow-400 px-8 py-5 font-baloo2 text-2xl font-extrabold text-blue-900 shadow-xl transition-transform hover:scale-105 hover:bg-yellow-500 active:scale-95"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
