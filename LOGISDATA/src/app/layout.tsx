import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "AAST Control Room | Supply Chain Audit",
  description: "Executive-grade data analytics and audit presentation for logistics and supply chain control.",
  applicationName: "LOGISDATA Control Room",
  keywords: ["supply chain", "logistics", "data audit", "fleet analytics", "warehouse control"],
  openGraph: {
    title: "AAST Supply Chain Control Room",
    description: "A bilingual, interactive audit of freight, demand, routing, and inventory signals.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
