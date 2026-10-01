import type { Config } from "tailwindcss";

/**
 * NOTE: this file previously mixed ESM (`import type`) with CommonJS
 * (`module.exports = config`) and had no default export, so any tool that
 * imported it as a module received `undefined`. It is now a plain ES
 * module, matching how `@config` in `globals.css` loads it.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#06121d",
        industrial: {
          950: "#06121d",
          900: "#0b1c2a",
          800: "#10283a",
          700: "#193248",
          600: "#27445d",
        },
        signal: {
          amber: "#f59e0b",
          emerald: "#4de1c1",
          cyan: "#7dd3fc",
          red: "#fb5b5b",
        },
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
        34: "8.5rem",
      },
      fontFamily: {
        sans: ["Cairo Variable", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Cairo Variable", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["0.68rem", { lineHeight: "1.3", letterSpacing: "0.12em" }],
        body: ["0.95rem", { lineHeight: "1.6" }],
        hero: ["clamp(3rem, 7vw, 7.35rem)", { lineHeight: "0.93", letterSpacing: "-0.075em" }],
        display: ["clamp(2.2rem, 5vw, 5.4rem)", { lineHeight: "0.95", letterSpacing: "-0.065em" }],
      },
      /** Motion system tokens, mirrored from src/lib/motion.ts. */
      transitionTimingFunction: {
        executive: "cubic-bezier(0.22, 1, 0.36, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      transitionDuration: {
        instant: "180ms",
        fast: "320ms",
        base: "550ms",
        slow: "800ms",
        cinematic: "1050ms",
      },
      boxShadow: {
        industrial: "0 22px 80px rgba(2, 12, 21, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
