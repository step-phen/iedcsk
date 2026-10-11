import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { Me } from "@/lib/auth";
import AcceptHandoverForm from "./_components/accept-handover-form";

export const metadata: Metadata = {
  title: "IEDCSK | Accept Handover",
  description: "Accept the class handed over to you.",
};

// The only screen an incoming teacher reaches until they accept; the API blocks everything else.
export default async function AcceptHandoverPage() {
  const me = await serverApi("/api/me");
  if (me.status === 401) redirect("/login");
  if (!me.ok) throw new Error(`GET /api/me failed: ${me.status}`);
  if (!((await me.json()) as Me).handoverPending) redirect("/teacher");

  const res = await serverApi("/api/me/handover");
  if (!res.ok) throw new Error(`GET /api/me/handover failed: ${res.status}`);
  const { incoming } = (await res.json()) as { incoming: { fromName: string; sectionCount: number } | null };
  if (!incoming) redirect("/teacher");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eae4c9] p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <AcceptHandoverForm fromName={incoming.fromName} sectionCount={incoming.sectionCount} />
      </div>
    </main>
  );
}
