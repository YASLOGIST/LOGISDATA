import { vi } from "vitest";
import { describe, expect, it } from "vitest";
import {
  applyLabelFocus,
  easeApproach,
  getActiveSectionIndex,
  getSectionApproach,
  getSectionFocus,
} from "@/lib/sceneFocus";
import { SECTIONS } from "@/lib/sections";

describe("getSectionFocus", () => {
  it("peaks at exactly the offset where its HTML section snaps into view", () => {
    for (const section of SECTIONS) {
      const snapOffset = section.index / (SECTIONS.length - 1);
      expect(getSectionFocus(snapOffset, section.index)).toBe(1);
    }
  });

  it("gives the last section full focus at the end of the scroll", () => {
    // v2 regression: with `offset * 5` the warehouse scene peaked at 0.9 and
    // was already fading when the user reached its section at offset 1.
    expect(getSectionFocus(1, 4)).toBe(1);
    expect(getSectionFocus(0.9, 4)).toBeLessThan(1);
  });

  it("is clamped to 0..1 and symmetric around its centre", () => {
    expect(getSectionFocus(0, 4)).toBe(0);
    expect(getSectionFocus(0.25, 0)).toBeCloseTo(getSectionFocus(0.25, 2), 10);
    for (let offset = 0; offset <= 1; offset += 0.05) {
      for (const section of SECTIONS) {
        const focus = getSectionFocus(offset, section.index);
        expect(focus).toBeGreaterThanOrEqual(0);
        expect(focus).toBeLessThanOrEqual(1);
      }
    }
  });

  it("falls back to the default spread when given a non-positive one", () => {
    expect(getSectionFocus(0.25, 1, 0)).toBe(1);
  });
});

describe("getActiveSectionIndex", () => {
  it.each([
    [0, 0],
    [0.2, 1],
    [0.25, 1],
    [0.5, 2],
    [0.76, 3],
    [1, 4],
  ])("offset %s resolves to section %s", (offset, expected) => {
    expect(getActiveSectionIndex(offset)).toBe(expected);
  });
});

describe("getSectionApproach", () => {
  it("runs 0 -> 1 over exactly one page of travel", () => {
    expect(getSectionApproach(0, 1)).toBe(0);
    expect(getSectionApproach(0.125, 1)).toBeCloseTo(0.5, 10);
    expect(getSectionApproach(0.25, 1)).toBe(1);
    expect(getSectionApproach(0.75, 4)).toBe(0);
    expect(getSectionApproach(1, 4)).toBe(1);
  });
});

describe("easeApproach", () => {
  it("is a clamped smoothstep", () => {
    expect(easeApproach(-1)).toBe(0);
    expect(easeApproach(0)).toBe(0);
    expect(easeApproach(0.5)).toBe(0.5);
    expect(easeApproach(1)).toBe(1);
    expect(easeApproach(2)).toBe(1);
  });
});

describe("applyLabelFocus", () => {
  it("hides, un-focuses and removes out-of-focus labels from the a11y tree", () => {
    const node = document.createElement("div");
    applyLabelFocus(node, 0);
    expect(node.style.visibility).toBe("hidden");
    expect(node.getAttribute("aria-hidden")).toBe("true");
    expect(node.style.pointerEvents).toBe("none");

    applyLabelFocus(node, 1);
    expect(node.style.visibility).toBe("visible");
    expect(node.dataset.focus).toBe("1.000");
    expect(node.getAttribute("aria-hidden")).toBe("false");
    expect(node.style.pointerEvents).toBe("auto");
  });

  it("is a no-op for a null node", () => {
    expect(() => applyLabelFocus(null, 1)).not.toThrow();
  });

  it("does not write styles that are already correct", () => {
    const node = document.createElement("div");
    applyLabelFocus(node, 0.5);
    const setProperty = vi.spyOn(node.style, "opacity", "set");
    applyLabelFocus(node, 0.5);
    expect(setProperty).not.toHaveBeenCalled();
  });
});
