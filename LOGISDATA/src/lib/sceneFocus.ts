import * as THREE from "three";

/**
 * Every 3D scene in the presentation stays mounted at all times, and the
 * camera rig only scales/repositions each scene's group as the user
 * scrolls between sections. Without also fading each scene's HTML label
 * overlays, out-of-focus sections keep rendering their labels at full
 * opacity — which is what caused labels from adjacent sections to visibly
 * pile up / overlap during scroll transitions.
 *
 * This mirrors the same focus curve the camera rig (IndustrialScene)
 * already uses for scale, so labels fade out in lockstep with their
 * parent scene shrinking into the background.
 */
export function getSectionFocus(scrollOffset: number, sectionIndex: number, spread = 1.08): number {
  const pagePosition = scrollOffset * 5;
  const sectionCenter = sectionIndex + 0.5;
  const distance = Math.abs(pagePosition - sectionCenter);
  return THREE.MathUtils.clamp(1 - distance / spread, 0, 1);
}

/** Applies focus-derived opacity/visibility directly to a label's DOM node. */
export function applyLabelFocus(node: HTMLElement | null, focus: number, hideThreshold = 0.05): void {
  if (!node) return;
  node.style.opacity = focus.toFixed(3);
  node.style.visibility = focus < hideThreshold ? "hidden" : "visible";
}
