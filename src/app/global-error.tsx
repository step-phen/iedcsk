"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches failures in the root layout itself, which
 * segment-level error.tsx files cannot reach.
 *
 * Because it replaces the root layout, it must render its own <html> and
 * <body>. That also means none of the app's fonts or global CSS are
 * guaranteed to be available here, so this deliberately uses inline styles
 * and system fonts rather than Tailwind classes.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#eae4c9",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            maxWidth: "26rem",
            width: "100%",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "1rem",
            padding: "2rem",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
            The application failed to load. Please try again.
          </p>

          {error.digest && (
            <p style={{ marginTop: "0.75rem", fontSize: "11px", color: "#9ca3af", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#5b0610",
              color: "#ffffff",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
