import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo/wght.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  metadataBase: new URL(siteUrl),
  title: {
    default: "AAST Control Room | Supply Chain Audit",
    template: "%s | AAST Control Room",
  },
  description:
    "Executive-grade data analytics and audit presentation for logistics and supply chain control: freight billing, demand distortion, fleet routing and warehouse inventory.",
  applicationName: "LOGISDATA Control Room",
  authors: [{ name: "Ahmed Yasser Ali" }],
  creator: "Ahmed Yasser Ali",
  publisher: "Arab Academy for Science, Technology & Maritime Transport",
  keywords: [
    "supply chain",
    "logistics",
    "data audit",
    "freight billing audit",
    "bullwhip effect",
    "fleet analytics",
    "warehouse control",
    "AAST",
  ],
  alternates: {
    canonical: "/",
    languages: { en: "/", ar: "/" },
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    url: siteUrl,
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
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06121d" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

/**
 * Applies the persisted theme/language before first paint.
 *
 * Without this, the document always painted the dark palette in LTR and
 * then snapped to the user's stored preference once the client bundle
 * executed -- a visible flash and a layout jump for Arabic visitors.
 * Kept deliberately tiny and dependency-free; it is the only inline
 * script on the page and is allow-listed in the CSP by hash.
 */
const PREFERENCE_BOOTSTRAP = `(function(){try{var s=localStorage,t=s.getItem("logisdata.theme"),l=s.getItem("logisdata.language"),d=document.documentElement;t=t==="light"||t==="dark"?t:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");d.dataset.theme=t;d.style.colorScheme=t;if(l==="ar"||l==="en"){d.lang=l;d.dir=l==="ar"?"rtl":"ltr";}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCE_BOOTSTRAP }} />
      </head>
      <body>
        {/*
          The control room is client-rendered (WebGL), so without JavaScript
          there is nothing to show. Previously the server-rendered cover
          screen carried the link to the text briefing; now that the deck
          opens directly, this is what keeps the content reachable with
          scripting disabled.
        */}
        <noscript>
          <div className="noscript-notice">
            <p>
              The interactive control room needs JavaScript and WebGL. The complete audit is
              available as a text briefing.
            </p>
            <p lang="ar" dir="rtl">
              تحتاج غرفة التحكم التفاعلية إلى جافاسكريبت و WebGL. التدقيق الكامل متاح كملخص نصي.
            </p>
            <a href="/handout">Open the text briefing</a>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
