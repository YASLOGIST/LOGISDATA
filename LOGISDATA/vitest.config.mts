import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text-summary", "lcov"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx", "src/db/**/*.ts"],
      // The WebGL orchestrator and the Three.js scenes require a real GPU
      // context; they are covered by the Playwright suite instead.
      exclude: ["src/components/three/**", "src/components/Presentation.tsx"],
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
