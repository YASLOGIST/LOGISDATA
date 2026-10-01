import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  SECTION_COUNT,
  clampSectionIndex,
  hashFromSectionIndex,
  pagePositionFromOffset,
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
