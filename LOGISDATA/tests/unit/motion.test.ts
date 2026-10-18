import { describe, expect, it } from "vitest";
import { scrollBehaviorForMotion } from "@/lib/motion";

describe("scrollBehaviorForMotion", () => {
  it("uses immediate navigation when reduced motion is requested", () => {
    expect(scrollBehaviorForMotion(true)).toBe("auto");
  });

  it("keeps smooth section transitions for users who allow motion", () => {
    expect(scrollBehaviorForMotion(false)).toBe("smooth");
  });
});
