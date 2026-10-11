import type { Metadata } from "next";

// The page is a client component, so its tab title lives here.
export const metadata: Metadata = {
  title: "IEDCSK | Promotion History",
  description: "Each school year's batch of learners promoted to Kinder 2.",
};

export default function PromotionHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
