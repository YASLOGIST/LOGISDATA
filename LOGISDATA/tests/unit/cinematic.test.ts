import { describe, expect, it } from "vitest";
import { getCinematicFrame, WAREHOUSE_SHOTS } from "@/lib/cinematic";

describe("warehouse cinematic scroll timeline", () => {
  it("defines one camera shot for each of the five presentation chapters", () => {
    expect(WAREHOUSE_SHOTS).toHaveLength(5);
    expect(getCinematicFrame(0)).toEqual(WAREHOUSE_SHOTS[0]);
    expect(getCinematicFrame(0.25)).toEqual(WAREHOUSE_SHOTS[1]);
    expect(getCinematicFrame(0.5)).toEqual(WAREHOUSE_SHOTS[2]);
    expect(getCinematicFrame(0.75)).toEqual(WAREHOUSE_SHOTS[3]);
    expect(getCinematicFrame(1)).toEqual(WAREHOUSE_SHOTS[4]);
  });

  it("smoothly interpolates adjacent shots in both scroll directions", () => {
    const forward = getCinematicFrame(0.375);
    const backward = getCinematicFrame(0.375);
    const halfwayBetweenShots = {
      zoom: (WAREHOUSE_SHOTS[1].zoom + WAREHOUSE_SHOTS[2].zoom) / 2,
      x: (WAREHOUSE_SHOTS[1].x + WAREHOUSE_SHOTS[2].x) / 2,
      y: (WAREHOUSE_SHOTS[1].y + WAREHOUSE_SHOTS[2].y) / 2,
    };

    expect(forward).toEqual(backward);
    expect(forward.zoom).toBeCloseTo(halfwayBetweenShots.zoom, 10);
    expect(forward.x).toBeCloseTo(halfwayBetweenShots.x, 10);
    expect(forward.y).toBeCloseTo(halfwayBetweenShots.y, 10);
  });

  it("clamps progress and safely handles non-finite input", () => {
    expect(getCinematicFrame(-2)).toEqual(WAREHOUSE_SHOTS[0]);
    expect(getCinematicFrame(4)).toEqual(WAREHOUSE_SHOTS[4]);
    expect(getCinematicFrame(Number.NaN)).toEqual(WAREHOUSE_SHOTS[0]);
    expect(getCinematicFrame(Number.POSITIVE_INFINITY)).toEqual(WAREHOUSE_SHOTS[0]);
  });

  it("minimizes pan and zoom when reduced motion is enabled", () => {
    const normal = getCinematicFrame(0.75);
    const reduced = getCinematicFrame(0.75, true);

    expect(Math.abs(reduced.zoom - 1)).toBeLessThan(Math.abs(normal.zoom - 1));
    expect(Math.abs(reduced.x - 0.5)).toBeLessThan(Math.abs(normal.x - 0.5));
    expect(Math.abs(reduced.y - 0.5)).toBeLessThan(Math.abs(normal.y - 0.5));
  });
});
