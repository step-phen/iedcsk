"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

/**
 * Error boundary for the teacher segment's children.
 *
 * Note this does NOT catch errors thrown by app/teacher/layout.tsx itself —
 * those fall through to the root (see app/global-error.tsx). It also does not
 * intercept redirect() or notFound(), which Next handles separately.
 */
export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The real error stays server/console-side. It is never rendered — a
    // A database failure message can carry schema and column names.
    console.error("[teacher] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={24} />
        </div>

        <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t load this page. This is usually temporary — try again,
          and if it keeps happening let your administrator know.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-gray-400">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#5b0610] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7a0a18]"
          >
            <RotateCw size={15} />
            Try again
          </button>
          <Link
            href="/teacher"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
