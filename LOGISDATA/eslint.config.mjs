import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    // Test files stub next/image with a plain <img>; the LCP rule is about
    // production markup, not about a jsdom test double.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
