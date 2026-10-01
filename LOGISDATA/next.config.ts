import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Trade-off, documented deliberately: `script-src` keeps `'unsafe-inline'`
 * because the App Router emits inline bootstrap/flight scripts on every
 * statically prerendered page. The alternative (nonce injection from
 * middleware) forces *every* route to render dynamically, which would
 * remove the static prerender of `/` and `/handout` for a presentation
 * that has no user input, no authentication and no secrets in the client.
 * Everything that can be locked down without that cost is locked down:
 * `object-src`, `base-uri`, `frame-ancestors` and `form-action` are all
 * closed, so the classic injection vectors remain unavailable.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' is only required by the dev-mode React refresh runtime.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // blob: covers the CSV export object URLs; ws: covers the dev HMR socket.
  `connect-src 'self' blob:${isProduction ? "" : " ws: wss:"}`,
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  // Opt-in self-contained server bundle for container deploys. Left off by
  // default because `next start` refuses to serve a standalone build; the
  // Dockerfile sets NEXT_OUTPUT=standalone and runs `node server.js`.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Tree-shakes barrel-file imports; `lucide-react` alone exports >1500
    // icon modules and the deck uses 20.
    optimizePackageImports: ["lucide-react", "@react-three/drei", "framer-motion"],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Immutable hashed build assets.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
