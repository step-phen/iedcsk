import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import PromotionHistory, { type PromotionYear } from "./_components/promotion-history";

export const metadata: Metadata = {
  title: "IEDCSK | Promotion History",
  description: "Each school year's batch of learners promoted to Grade 1.",
};

export default async function PromotedLearnersPage() {
  const res = await serverApi("/api/promotions");
  if (!res.ok) throw new Error(`GET /api/promotions failed: ${res.status}`);

  return <PromotionHistory years={(await res.json()) as PromotionYear[]} />;
}
