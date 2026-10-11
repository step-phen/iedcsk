import Link from "next/link";

/**
 * Root 404 for unknown URLs. This renders inside the root layout and is
 * shared by both audiences (teachers and learners), so it stays visually
 * neutral and keeps text minimal.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#eae4c9] px-6 py-10 text-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="font-chewy text-6xl text-[#5b0610]">404</p>

        <h1 className="mt-3 text-lg font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#5b0610] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7a0a18]"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
