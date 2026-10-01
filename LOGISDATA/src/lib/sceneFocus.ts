import { clampSectionIndex, pagePositionFromOffset, SECTION_COUNT } from "./sections";

/**
 * Every 3D scene in the presentation stays mounted at all times, and the
 * camera rig only scales/repositions each scene's group as the user
 * scrolls between sections. Without also fading each scene's HTML label
 * overlays, out-of-focus sections keep rendering their labels at full
 * opacity -- which is what caused labels from adjacent sections to visibly
 * pile up / overlap during scroll transitions.
 *
 * `getSectionFocus` mirrors the focus curve the camera rig
 * (IndustrialScene) uses for scale, so labels fade out in lockstep with
 * their parent scene shrinking into the background.
 *
 * NOTE (fixed in v3): the previous implementation mapped the normalized
 * ScrollControls offset with `offset * 5` and placed each section's focus
 * centre at `index + 0.5`. `ScrollControls` with `pages = N` only scrolls
 * `N - 1` viewport heights, so the correct mapping is `offset * (N - 1)`
 * with the focus centre at `index`. The old math peaked section focus at
 * offsets 0.1/0.3/0.5/0.7/0.9 while the HTML sections actually snap to
 * 0.0/0.25/0.5/0.75/1.0 -- i.e. the 3D model was up to 40% of a page out of
 * sync with the text it was illustrating, and the final warehouse scene was
 * already fading out when its section became fully visible.
 */
export const FOCUS_SPREAD = 1.08;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function getSectionFocus(scrollOffset: number, sectionIndex: number, spread = FOCUS_SPREAD): number {
  const safeSpread = spread > 0 ? spread : FOCUS_SPREAD;
  const pagePosition = pagePositionFromOffset(scrollOffset);
  const distance = Math.abs(pagePosition - clampSectionIndex(sectionIndex));
  return clamp01(1 - distance / safeSpread);
}

/** Section index whose content currently fills the viewport. */
export function getActiveSectionIndex(scrollOffset: number): number {
  return clampSectionIndex(Math.round(pagePositionFromOffset(scrollOffset)));
}

/** Applies focus-derived opacity/visibility directly to a label's DOM node. */
export function applyLabelFocus(node: HTMLElement | null, focus: number, hideThreshold = 0.05): void {
  if (!node) return;
  const hidden = focus < hideThreshold;
  const opacity = focus.toFixed(3);

  // Guard against redundant style writes: `useFrame` runs this up to 60x/s
  // per label and every assignment to `style.*` invalidates style on the
  // element even when the value is unchanged. The previous value is kept in
  // a data attribute rather than read back from `style.opacity`, because
  // the CSSOM re-serialises numbers ("0.500" reads back as "0.5") and the
  // comparison would therefore never match.
  if (node.dataset.focus !== opacity) {
    node.dataset.focus = opacity;
    node.style.opacity = opacity;
  }

  const visibility = hidden ? "hidden" : "visible";
  if (node.style.visibility !== visibility) node.style.visibility = visibility;

  // Out-of-focus scene labels must leave the accessibility tree and the hit
  // area entirely, otherwise assistive tech announces five sections at once.
  const ariaHidden = hidden ? "true" : "false";
  if (node.getAttribute("aria-hidden") !== ariaHidden) node.setAttribute("aria-hidden", ariaHidden);

  const pointerEvents = hidden ? "none" : "auto";
  if (node.style.pointerEvents !== pointerEvents) node.style.pointerEvents = pointerEvents;
}

export { SECTION_COUNT };

/**
 * Progress (0..1) of the camera travelling from section `index - 1` to
 * section `index`.
 *
 * Each 3D scene previously hard-coded its own window over the raw scroll
 * offset -- `(offset - 0.2) / 0.2`, `(offset - 0.4) / 0.2`, ... -- which
 * assumed five 0.2-wide pages. With `pages = 5` ScrollControls only has
 * four 0.25-wide transitions, so every scene's animation completed 20%
 * early and then sat clamped at 1 while the user was still scrolling
 * toward it. This helper derives the window from the section count.
 */
export function getSectionApproach(scrollOffset: number, sectionIndex: number): number {
  const pagePosition = pagePositionFromOffset(scrollOffset);
  return clamp01(pagePosition - (clampSectionIndex(sectionIndex) - 1));
}

/** `smoothstep` easing for approach progress. */
export function easeApproach(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}
