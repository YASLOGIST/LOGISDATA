/**
 * Device + capability probing used to decide whether the WebGL control
 * room can run, and at what quality tier.
 *
 * The previous build mounted the full React Three Fiber canvas
 * unconditionally and hard-coded `dpr={1}`. That meant:
 *   - no-WebGL browsers got a blank canvas behind the error boundary,
 *   - every retina device rendered at 1x (visibly soft text/geometry),
 *   - low-end hardware ran the same geometry/particle budget as a desktop.
 */

export type DeviceTier = "high" | "medium" | "low" | "none";

export interface DeviceProfile {
  tier: DeviceTier;
  /** `[min, max]` device pixel ratio clamp handed to the R3F canvas. */
  dpr: [number, number];
  /** Whether ambient particle / depth effects should render at all. */
  effects: boolean;
  /** Point count budget for the ambient data-stream field. */
  particleBudget: number;
  /** Whether MSAA is affordable. */
  antialias: boolean;
  reducedMotion: boolean;
}

export const STATIC_PROFILE: DeviceProfile = {
  tier: "none",
  dpr: [1, 1],
  effects: false,
  particleBudget: 0,
  antialias: false,
  reducedMotion: true,
};

/** True when the browser can actually create a WebGL rendering context. */
export function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!context) return false;
    // Release the probe context immediately; browsers cap concurrent contexts.
    const lose = (context as WebGLRenderingContext).getExtension?.("WEBGL_lose_context");
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface NavigatorLike {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
  maxTouchPoints?: number;
}

/**
 * Classifies the current device. Pure with respect to its inputs so it can
 * be unit-tested without a browser.
 */
export function classifyDevice(input: {
  webgl: boolean;
  reducedMotion: boolean;
  devicePixelRatio: number;
  navigator: NavigatorLike;
  viewportWidth: number;
}): DeviceProfile {
  if (!input.webgl) return { ...STATIC_PROFILE, reducedMotion: input.reducedMotion };

  const cores = input.navigator.hardwareConcurrency ?? 4;
  const memory = input.navigator.deviceMemory ?? 4;
  const saveData = input.navigator.connection?.saveData === true;
  const slowNetwork = ["slow-2g", "2g", "3g"].includes(input.navigator.connection?.effectiveType ?? "");
  const small = input.viewportWidth < 768;

  let tier: DeviceTier = "high";
  if (cores <= 4 || memory <= 4 || small) tier = "medium";
  if (cores <= 2 || memory <= 2 || saveData || slowNetwork) tier = "low";

  const dpr: [number, number] =
    tier === "high" ? [1, Math.min(2, Math.max(1, input.devicePixelRatio))]
      : tier === "medium" ? [1, Math.min(1.5, Math.max(1, input.devicePixelRatio))]
        : [1, 1];

  return {
    tier,
    dpr,
    // Reduced motion keeps the scene but drops continuous ambient animation.
    effects: tier !== "low" && !input.reducedMotion,
    particleBudget: input.reducedMotion ? 0 : tier === "high" ? 900 : tier === "medium" ? 420 : 0,
    antialias: tier !== "low",
    reducedMotion: input.reducedMotion,
  };
}

/** Browser-side convenience wrapper around {@link classifyDevice}. */
export function probeDevice(): DeviceProfile {
  if (typeof window === "undefined") return STATIC_PROFILE;
  return classifyDevice({
    webgl: detectWebGL(),
    reducedMotion: prefersReducedMotion(),
    devicePixelRatio: window.devicePixelRatio || 1,
    navigator: window.navigator as unknown as NavigatorLike,
    viewportWidth: window.innerWidth,
  });
}
