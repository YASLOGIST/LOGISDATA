import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyDevice, detectWebGL, prefersReducedMotion, probeDevice, STATIC_PROFILE } from "@/lib/device";

const base = {
  webgl: true,
  reducedMotion: false,
  devicePixelRatio: 3,
  navigator: { hardwareConcurrency: 16, deviceMemory: 16 },
  viewportWidth: 1920,
};

describe("classifyDevice", () => {
  it("returns the static profile when WebGL is unavailable", () => {
    const profile = classifyDevice({ ...base, webgl: false });
    expect(profile.tier).toBe("none");
    expect(profile.particleBudget).toBe(0);
    expect(profile.dpr).toEqual(STATIC_PROFILE.dpr);
  });

  it("caps device pixel ratio at 2 on high-end hardware", () => {
    // Regression guard for the v2 hard-coded `dpr={1}` (soft on retina) and
    // for the opposite failure mode: an uncapped DPR 3 renders 9x the pixels.
    expect(classifyDevice(base).dpr).toEqual([1, 2]);
  });

  it("drops to the medium tier on few cores or a narrow viewport", () => {
    expect(classifyDevice({ ...base, navigator: { hardwareConcurrency: 4, deviceMemory: 8 } }).tier).toBe("medium");
    expect(classifyDevice({ ...base, viewportWidth: 420 }).tier).toBe("medium");
    expect(classifyDevice({ ...base, viewportWidth: 420 }).dpr[1]).toBeLessThanOrEqual(1.5);
  });

  it("drops to the low tier on save-data, slow networks or tiny devices", () => {
    expect(classifyDevice({ ...base, navigator: { connection: { saveData: true } } }).tier).toBe("low");
    expect(classifyDevice({ ...base, navigator: { connection: { effectiveType: "2g" } } }).tier).toBe("low");
    expect(classifyDevice({ ...base, navigator: { hardwareConcurrency: 2 } }).tier).toBe("low");
  });

  it("disables antialiasing and effects on the low tier only", () => {
    const low = classifyDevice({ ...base, navigator: { hardwareConcurrency: 1 } });
    expect(low.antialias).toBe(false);
    expect(low.effects).toBe(false);
    expect(low.particleBudget).toBe(0);
    expect(classifyDevice(base).antialias).toBe(true);
  });

  it("zeroes the particle budget under prefers-reduced-motion", () => {
    const reduced = classifyDevice({ ...base, reducedMotion: true });
    expect(reduced.reducedMotion).toBe(true);
    expect(reduced.particleBudget).toBe(0);
    expect(reduced.effects).toBe(false);
    // The scene itself still renders; only continuous motion is removed.
    expect(reduced.tier).toBe("high");
  });

  it("scales the particle budget down with the tier", () => {
    const high = classifyDevice(base).particleBudget;
    const medium = classifyDevice({ ...base, viewportWidth: 420 }).particleBudget;
    expect(high).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(0);
  });
});

describe("detectWebGL", () => {
  it("reports false when the canvas yields no context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectWebGL()).toBe(false);
  });

  it("reports true and releases the probe context", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as RenderingContext);
    expect(detectWebGL()).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("swallows exceptions thrown by hardened browsers", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(detectWebGL()).toBe(false);
  });
});

describe("prefersReducedMotion / probeDevice", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the media query", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }) as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("probeDevice never throws in a DOM-less or WebGL-less environment", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal("matchMedia", () => ({ matches: false }) as MediaQueryList);
    expect(probeDevice().tier).toBe("none");
  });
});
