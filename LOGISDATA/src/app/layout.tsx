import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo";
import "./globals.css";

const OG_TITLE = "LOGISDATA — Supply Chain Control Room";
const OG_DESCRIPTION =
  "A bilingual, interactive audit of freight billing, demand distortion, fleet routing and inventory truth — five synchronized 3D theatres on a single WebGL canvas.";

/**
 * Animated card first (GIF, 1200x630) with a static PNG twin behind it:
 * scrapers that cannot decode GIF — or that only render the first frame —
 * fall through to the still without losing the composition.
 * Both assets are generated from `tools/og-image`.
 */
const OG_IMAGES = [
  {
    url: "/og-image-animated.gif",
    width: 1200,
    height: 630,
    type: "image/gif",
    alt: "LOGISDATA control room card: an audit gate sweeping across the supply signal graph, leakage metrics and the five-stage audit rail.",
  },
  {
    url: "/og-image.png",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: "LOGISDATA supply-chain audit control room preview card.",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "AAST Control Room | Supply Chain Audit",
  description: "Executive-grade data analytics and audit presentation for logistics and supply chain control.",
  applicationName: "LOGISDATA Control Room",
  keywords: ["supply chain", "logistics", "data audit", "fleet analytics", "warehouse control"],
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    siteName: "LOGISDATA Control Room",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
    images: OG_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: OG_IMAGES.map((image) => image.url),
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
