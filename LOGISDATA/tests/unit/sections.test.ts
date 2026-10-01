import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  SECTION_COUNT,
  clampSectionIndex,
  hashFromSectionIndex,
  pagePositionFromOffset,
  scrollRange,
  scrollTopForSection,
  sectionFromScrollTop,
  sectionIndexFromHash,
} from "@/lib/sections";

describe("section registry", () => {
  it("exposes five uniquely slugged sections with sequential indices", () => {
    expect(SECTION_COUNT).toBe(5);
    expect(SECTIONS.map((section) => section.index)).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(SECTIONS.map((section) => section.slug)).size).toBe(SECTION_COUNT);
    expect(new Set(SECTIONS.map((section) => section.domId)).size).toBe(SECTION_COUNT);
  });

  it("provides bilingual labels for every section", () => {
    for (const section of SECTIONS) {
      expect(section.label.en.length).toBeGreaterThan(0);
      expect(section.label.ar.length).toBeGreaterThan(0);
    }
  });
});

describe("clampSectionIndex", () => {
  it.each([
    [-99, 0],
    [-1, 0],
    [0, 0],
    [3, 3],
    [4, 4],
    [5, 4],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampSectionIndex(input)).toBe(expected);
  });
});

describe("hash round-tripping", () => {
  it("resolves every slug form", () => {
    expect(sectionIndexFromHash("#audit")).toBe(1);
    expect(sectionIndexFromHash("audit")).toBe(1);
    expect(sectionIndexFromHash("#section-audit")).toBe(1);
    expect(sectionIndexFromHash("#AUDIT")).toBe(1);
  });

  it("returns null for unknown or empty hashes", () => {
    expect(sectionIndexFromHash("")).toBeNull();
    expect(sectionIndexFromHash(null)).toBeNull();
    expect(sectionIndexFromHash("#nope")).toBeNull();
  });

  it("round-trips index -> hash -> index", () => {
    for (const section of SECTIONS) {
      expect(sectionIndexFromHash(hashFromSectionIndex(section.index))).toBe(section.index);
    }
  });
});

describe("pagePositionFromOffset", () => {
  // Regression guard for the v2 bug: `offset * SECTION_COUNT` overshot the
  // last page because ScrollControls only scrolls `pages - 1` viewports.
  it("maps offset 0..1 onto 0..SECTION_COUNT-1", () => {
    expect(pagePositionFromOffset(0)).toBe(0);
    expect(pagePositionFromOffset(0.25)).toBe(1);
    expect(pagePositionFromOffset(0.5)).toBe(2);
    expect(pagePositionFromOffset(1)).toBe(SECTION_COUNT - 1);
  });

  it("clamps out-of-range and non-finite offsets", () => {
    expect(pagePositionFromOffset(-2)).toBe(0);
    expect(pagePositionFromOffset(7)).toBe(SECTION_COUNT - 1);
    expect(pagePositionFromOffset(Number.NaN)).toBe(0);
  });
});

describe("scroll geometry", () => {
  // Regression guard for the bug Playwright caught: a programmatic jump used
  // `index * clientHeight`, which only holds if the scrollable distance is
  // exactly `pages * clientHeight`. drei's element is taller than that, so
  // every jump landed short of its section.
  const CLIENT = 720;

  it("maps section 0 to the top and the last section to the very bottom", () => {
    const height = 4176; // deliberately NOT 5 * CLIENT
    expect(scrollTopForSection(0, height, CLIENT)).toBe(0);
    expect(scrollTopForSection(SECTION_COUNT - 1, height, CLIENT)).toBe(height - CLIENT);
  });

  it("spaces sections evenly across the real scroll range", () => {
    const height = 4176;
    const range = height - CLIENT;
    for (let i = 0; i < SECTION_COUNT; i += 1) {
      expect(scrollTopForSection(i, height, CLIENT)).toBeCloseTo(
        (i / (SECTION_COUNT - 1)) * range,
        6,
      );
    }
  });

  it("does not assume the scroll range equals pages * clientHeight", () => {
    // The old formula; proves the two disagree whenever the element is taller.
    const height = 4176;
    expect(scrollTopForSection(3, height, CLIENT)).not.toBeCloseTo(3 * CLIENT, 0);
  });

  it("round-trips every section through scrollTop and back", () => {
    for (const height of [3600, 4176, 5000, 721]) {
      for (let i = 0; i < SECTION_COUNT; i += 1) {
        const top = scrollTopForSection(i, height, CLIENT);
        expect(sectionFromScrollTop(top, height, CLIENT)).toBe(i);
      }
    }
  });

  it("clamps out-of-range sections instead of scrolling past the end", () => {
    const height = 4176;
    expect(scrollTopForSection(-3, height, CLIENT)).toBe(0);
    expect(scrollTopForSection(99, height, CLIENT)).toBe(height - CLIENT);
  });

  it("treats an unscrollable element as section 0 rather than dividing by zero", () => {
    expect(scrollRange(CLIENT, CLIENT)).toBe(0);
    expect(scrollTopForSection(3, CLIENT, CLIENT)).toBe(0);
    expect(sectionFromScrollTop(0, CLIENT, CLIENT)).toBe(0);
    expect(Number.isNaN(sectionFromScrollTop(10, CLIENT, CLIENT))).toBe(false);
  });

  it("snaps an intermediate scroll position to the nearest section", () => {
    const height = 4176;
    const range = height - CLIENT;
    expect(sectionFromScrollTop(range * 0.51, height, CLIENT)).toBe(2);
    expect(sectionFromScrollTop(range * 0.62, height, CLIENT)).toBe(2);
    expect(sectionFromScrollTop(range * 0.64, height, CLIENT)).toBe(3);
  });
});
