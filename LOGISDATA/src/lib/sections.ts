import { presentationCopy } from "./data";
import type { LocalizedText } from "./types";

/**
 * Single source of truth for the five presentation sections.
 *
 * Before this module the section count, the 0-4 indices, the `#section-N`
 * DOM ids and the camera-rig page math were duplicated across
 * `Presentation`, `IndustrialScene`, `sceneFocus` and every `sections/*`
 * component. Any change had to be made in six places. Everything now
 * derives from `SECTIONS`.
 */
export interface SectionDescriptor {
  /** 0-based scroll page index. */
  index: number;
  /** URL-safe deep-link slug (`/#audit`). */
  slug: string;
  /** DOM id of the HTML section element. */
  domId: string;
  /** Localized navigation label. */
  label: LocalizedText;
}

const SLUGS = ["overview", "audit", "demand", "routes", "warehouse"] as const;

export type SectionSlug = (typeof SLUGS)[number];

export const SECTIONS: readonly SectionDescriptor[] = SLUGS.map((slug, index) => ({
  index,
  slug,
  domId: `section-${slug}`,
  label: presentationCopy.nav.sections[index] ?? { en: slug, ar: slug },
}));

export const SECTION_COUNT = SECTIONS.length;

/** Clamps any number into a valid section index. Returns 0 for NaN. */
export function clampSectionIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(SECTION_COUNT - 1, Math.max(0, Math.trunc(value)));
}

/** Resolves a location hash (`#audit`, `audit`, `#section-audit`) to an index. */
export function sectionIndexFromHash(hash: string | null | undefined): number | null {
  if (!hash) return null;
  const normalized = hash.replace(/^#/, "").replace(/^section-/, "").toLowerCase();
  const match = SECTIONS.find((section) => section.slug === normalized);
  return match ? match.index : null;
}

/** Inverse of {@link sectionIndexFromHash}. */
export function hashFromSectionIndex(index: number): string {
  return `#${SECTIONS[clampSectionIndex(index)].slug}`;
}

/**
 * Converts a normalized ScrollControls offset (0..1) into fractional page
 * position. `ScrollControls` with N pages scrolls `N - 1` viewport heights,
 * so the correct multiplier is `SECTION_COUNT - 1`, not `SECTION_COUNT`.
 */
export function pagePositionFromOffset(offset: number): number {
  const clamped = Number.isFinite(offset) ? Math.min(1, Math.max(0, offset)) : 0;
  return clamped * (SECTION_COUNT - 1);
}
