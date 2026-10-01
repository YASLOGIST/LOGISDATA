# `tools/og-image`

Deterministic renderer for the LOGISDATA social preview. It draws the card as
vectors from the same design tokens as `src/app/globals.css` and the same
supply graph as `src/lib/data.ts`, so the Open Graph image can never drift
from the product it advertises.

## Outputs

| File | Role |
| :--- | :--- |
| `LOGISDATA/public/og-image-animated.gif` | Primary OG / Twitter card — 1200×630, 36 frames, 2.16 s seamless loop |
| `LOGISDATA/public/og-image.png` | Static fallback, identical composition at rest |

## Commands

```bash
npm install
npm run build                      # gif + png
npm run preview                    # png only — fast design iteration
node generate-og.mjs --frame=13    # render any single frame to the png path
```

## How it stays small and sharp

1. Frames are rendered at 2× (2400×1260) and box-filtered down — free antialiasing, no browser in the loop.
2. One global 255-colour palette is fitted across a stratified sample of frames.
3. An 8×8 Bayer ordered dither removes gradient banding while preserving the long pixel runs LZW needs.
4. Frames are delta-encoded: unchanged pixels become the transparent index with `dispose: 1`.
5. All motion is periodic over the loop and the audit gate parks off-canvas for the final 18%, so frame 36 matches frame 1 — no seam.
6. Noise is hash-derived, never `Math.random`, so the same source always produces the same bytes.

Fonts (Space Grotesk, JetBrains Mono, Cairo) are pulled from `@expo-google-fonts/*`
as raw TTF and registered at runtime — no system font dependency.
