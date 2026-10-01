import type { Transition } from "framer-motion";

/**
 * Centralised motion system.
 *
 * Previously every section component redeclared
 * `const ease = [0.22, 1, 0.36, 1] as const` and hand-wrote durations
 * between 0.45s and 0.9s with ad-hoc stagger deltas (0.06 / 0.07 / 0.08 /
 * 0.1). That produced inconsistent rhythm between sections and made
 * reduced-motion support impossible to apply globally.
 */
export const EASE_EXECUTIVE = [0.22, 1, 0.36, 1] as const;
export const EASE_EXIT = [0.4, 0, 1, 1] as const;

/** Duration scale in seconds. Keep every animation on one of these steps. */
export const DURATION = {
  /** micro-interaction: hover, focus ring, chip */
  instant: 0.18,
  /** control state change */
  fast: 0.32,
  /** element entrance */
  base: 0.55,
  /** section entrance */
  slow: 0.8,
  /** full-page transition */
  cinematic: 1.05,
} as const;

/** Stagger steps in seconds. */
export const STAGGER = {
  tight: 0.04,
  base: 0.06,
  loose: 0.1,
} as const;

export interface MotionOptions {
  /** When true every transition collapses to an instant, non-animated swap. */
  reduced?: boolean | null;
  delay?: number;
}

/** Builds a framer-motion transition that automatically honours reduced motion. */
export function transition(
  duration: keyof typeof DURATION | number = "base",
  { reduced = false, delay = 0 }: MotionOptions = {},
): Transition {
  if (reduced) return { duration: 0, delay: 0 };
  const seconds = typeof duration === "number" ? duration : DURATION[duration];
  return { duration: seconds, delay, ease: EASE_EXECUTIVE };
}

/** Stagger delay for the nth item in a list, clamped so long lists stay snappy. */
export function staggerDelay(
  index: number,
  { reduced = false, step = STAGGER.base, max = 0.42 }: MotionOptions & { step?: number; max?: number } = {},
): number {
  if (reduced) return 0;
  return Math.min(max, Math.max(0, index) * step);
}

/** Shared entrance variant: translate + fade, GPU-friendly (transform/opacity only). */
export function rise(reduced?: boolean | null, distance = 22) {
  return {
    initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
  };
}

/** Directional entrance that flips automatically for RTL layouts. */
export function slideIn(rtl: boolean, reduced?: boolean | null, distance = 14) {
  return {
    initial: reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: rtl ? distance : -distance },
    animate: { opacity: 1, x: 0 },
  };
}
