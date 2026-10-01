import type { Metadata } from "next";
import { HandoutView } from "@/components/HandoutView";

export const metadata: Metadata = {
  title: "Text briefing",
  description:
    "Accessible, printable text version of the AAST supply chain audit: freight billing reconciliation, demand distortion, route intelligence and warehouse control findings.",
  alternates: { canonical: "/handout" },
  openGraph: {
    title: "AAST Supply Chain Audit — text briefing",
    description: "Every table, metric and finding from the control room, without WebGL.",
    type: "article",
  },
};

export default function HandoutPage() {
  return <HandoutView />;
}
