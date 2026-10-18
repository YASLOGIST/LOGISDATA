/**
 * Scroll-scrubbed framing for the warehouse photo plate.
 *
 * This deliberately is not an autoplay loop: the background is a five-shot
 * camera move whose playhead is the presentation's scroll position. When the
 * operator pauses on a chapter, the image holds on that shot.
 */
export interface CinematicFrame {
  /** Scale of the sampled image area (1 = the full photograph). */
  zoom: number;
  /** Normalized crop origin, from the left/top (0) to the right/bottom (1). */
  x: number;
  y: number;
}

/** One warehouse establishing shot for each of the five presentation chapters. */
export const WAREHOUSE_SHOTS: readonly CinematicFrame[] = [
  { zoom: 1.02, x: 0.5, y: 0.5 }, // overview: full warehouse aisle
  { zoom: 1.12, x: 0.22, y: 0.5 }, // invoice audit: left-side pallet racks
  { zoom: 1.1, x: 0.48, y: 0.42 }, // demand: central aisle and load flow
  { zoom: 1.13, x: 0.76, y: 0.52 }, // routes: right-side operations lane
  { zoom: 1.18, x: 0.48, y: 0.56 }, // warehouse: close view of rack inventory
] as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/**
 * Interpolates the real warehouse backdrop along the five chapter shots.
 * The same normalized progress drives both directions, so scrolling upward
 * retraces the camera path exactly rather than starting a second animation.
 */
export function getCinematicFrame(progress: number, reducedMotion = false): CinematicFrame {
  if (WAREHOUSE_SHOTS.length === 1) return WAREHOUSE_SHOTS[0];

  const position = clamp01(progress) * (WAREHOUSE_SHOTS.length - 1);
  const fromIndex = Math.min(WAREHOUSE_SHOTS.length - 1, Math.floor(position));
  const toIndex = Math.min(WAREHOUSE_SHOTS.length - 1, fromIndex + 1);
  const amount = smoothstep(position - fromIndex);
  const from = WAREHOUSE_SHOTS[fromIndex];
  const to = WAREHOUSE_SHOTS[toIndex];

  const zoom = from.zoom + (to.zoom - from.zoom) * amount;
  const x = from.x + (to.x - from.x) * amount;
  const y = from.y + (to.y - from.y) * amount;

  if (!reducedMotion) return { zoom, x, y };

  // Keep the scene-to-scene relationship, but minimize camera movement for
  // visitors who have requested reduced motion.
  return {
    zoom: 1 + (zoom - 1) * 0.18,
    x: 0.5 + (x - 0.5) * 0.18,
    y: 0.5 + (y - 0.5) * 0.18,
  };
}
