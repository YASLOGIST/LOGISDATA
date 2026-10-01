#!/usr/bin/env node
/**
 * LOGISDATA — Open Graph card renderer
 * ------------------------------------------------------------------
 * Deterministic, dependency-pinned vector pipeline that renders the social
 * preview assets straight from the design tokens in `src/app/globals.css`
 * and the live domain data in `src/lib/data.ts`:
 *
 *   public/og-image-animated.gif   1200x630, looping audit-sweep animation
 *   public/og-image.png            1200x630, static fallback (settled frame)
 *
 * Why hand-rolled vector rendering instead of a screenshot?
 *   - Pixel-exact brand tokens, no browser/GPU drift between machines.
 *   - Crisp type at 1x (supersampled 2x then box-filtered down).
 *   - Reproducible: same input -> byte-identical output, reviewable in CI.
 *
 * GIF strategy (the part that keeps the file small):
 *   1. Render every frame at 2x and downsample for free antialiasing.
 *   2. Build ONE global 255-colour palette from a stratified sample of frames.
 *   3. Map with an 8x8 Bayer ordered dither -> smooth gradients, no banding,
 *      and far better LZW runs than error-diffusion dithering.
 *   4. Inter-frame delta encoding: pixels identical to the previous frame are
 *      written as the transparent index with `dispose: 1`, so the decoder
 *      keeps them. Long transparent runs compress to almost nothing.
 *
 * Usage:  npm run build        # gif + png
 *         npm run preview      # png only (fast design iteration)
 */

import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import gifenc from "gifenc";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { GIFEncoder, quantize } = gifenc;
const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "..", "LOGISDATA", "public");

/* ------------------------------------------------------------------ *
 * 1. Canvas + animation configuration
 * ------------------------------------------------------------------ */

const W = 1200;
const H = 630;
const SS = 2; // supersample factor
const FRAMES = 36;
const DELAY_MS = 60; // 36 x 60ms = 2.16s loop
const STILL_FRAME = 35; // settled frame used for the static PNG fallback

/* ------------------------------------------------------------------ *
 * 2. Design tokens — mirrored 1:1 from src/app/globals.css
 * ------------------------------------------------------------------ */

const C = {
  bg: "#06121d",
  bgDeep: "#030a11",
  text: "#edf7fb",
  soft: "#a8becb",
  muted: "#6e8795",
  emerald: "#4de1c1",
  cyan: "#7dd3fc",
  amber: "#f59e0b",
  red: "#fb5b5b",
  line: "rgba(201,226,239,0.13)",
  lineStrong: "rgba(201,226,239,0.26)",
};

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* ------------------------------------------------------------------ *
 * 3. Typography
 * ------------------------------------------------------------------ */

const font = (pkg, file, alias) => {
  GlobalFonts.registerFromPath(require.resolve(`@expo-google-fonts/${pkg}/${file}`), alias);
  return alias;
};

const DISPLAY = font("space-grotesk", "700Bold/SpaceGrotesk_700Bold.ttf", "LD-Display");
const DISPLAY_MED = font("space-grotesk", "500Medium/SpaceGrotesk_500Medium.ttf", "LD-DisplayMedium");
const MONO = font("jetbrains-mono", "700Bold/JetBrainsMono_700Bold.ttf", "LD-Mono");
const MONO_REG = font("jetbrains-mono", "500Medium/JetBrainsMono_500Medium.ttf", "LD-MonoRegular");
const ARABIC = font("cairo", "600SemiBold/Cairo_600SemiBold.ttf", "LD-Arabic");

/* ------------------------------------------------------------------ *
 * 4. Domain data — the real graph from src/lib/data.ts
 * ------------------------------------------------------------------ */

const NODES = [
  { id: "port", label: "PORT", p: [-3.7, 1.1], status: "verified" },
  { id: "yard", label: "YARD", p: [-2.0, -0.6], status: "leak" },
  { id: "factory", label: "FACTORY", p: [-0.5, 1.65], status: "verified" },
  { id: "crossdock", label: "CROSS-DOCK", p: [1.0, -0.8], status: "phantom" },
  { id: "hub", label: "HUB", p: [2.25, 1.0], status: "verified" },
  { id: "store", label: "STORE", p: [3.7, -0.35], status: "leak" },
  { id: "returns", label: "RETURNS", p: [1.1, 2.15], status: "phantom" },
  { id: "data", label: "DATA LAKE", p: [-1.35, 2.6], status: "verified" },
];

const EDGES = [
  ["port", "yard"], ["yard", "factory"], ["factory", "crossdock"], ["crossdock", "hub"],
  ["hub", "store"], ["data", "factory"], ["data", "hub"], ["returns", "factory"],
  ["returns", "data"], ["yard", "data"],
];

const STATUS_COLOR = { verified: C.emerald, leak: C.red, phantom: C.amber };

const SECTIONS = ["HIDDEN COST", "INVOICE AUDIT", "BULLWHIP AUDIT", "ROUTE INTELLIGENCE", "WAREHOUSE CONTROL"];

const METRICS = [
  { value: "$2.1T", label: "GLOBAL ANNUAL WASTE", tone: C.amber, numeric: true },
  { value: "3.8%", label: "AVG INVOICE DISCREPANCY", tone: C.red, numeric: true },
  { value: "6.4x", label: "REAL-TIME AUDIT ROI", tone: C.emerald, numeric: true },
  { value: "AR / EN", label: "BILINGUAL — RTL NATIVE", tone: C.cyan, numeric: false },
];

/* ------------------------------------------------------------------ *
 * 5. Layout grid
 * ------------------------------------------------------------------ */

const L = {
  pad: 56,
  topbar: 88,
  colRight: 656, // left column right edge
  panel: { x: 700, y: 118, w: 444, h: 352 },
  rail: { y: 430, x: 56, w: 600 },
  divider: 492,
  metrics: { y: 498, h: 66 },
  footerRule: 576,
};

/* ------------------------------------------------------------------ *
 * 6. Drawing primitives
 * ------------------------------------------------------------------ */

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
/** Deterministic hash noise so every run produces identical bytes. */
const noise = (i, j) => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Hairline on the device pixel grid so 1px rules stay crisp after downsampling. */
function hLine(ctx, x1, x2, y, color, width = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y) + 0.5);
  ctx.lineTo(x2, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.restore();
}

function vLine(ctx, x, y1, y2, color, width = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, y1);
  ctx.lineTo(Math.round(x) + 0.5, y2);
  ctx.stroke();
  ctx.restore();
}

/** Letter-spaced text (canvas has no tracking primitive we can rely on). */
function tracked(ctx, str, x, y, spacing) {
  let cursor = x;
  for (const ch of str) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  return cursor - x - spacing;
}

function trackedWidth(ctx, str, spacing) {
  let w = 0;
  for (const ch of str) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}

function glow(ctx, color, blur, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

/**
 * The institutional crest ships as black line art on white. Re-key it as
 * luminance-to-alpha so it can sit on the dark control-room surface in any
 * brand tint without shipping a second asset.
 */
async function loadTintedCrest(size, tint) {
  const src = await loadImage(join(PUBLIC_DIR, "aast-logo.png"));
  const c = createCanvas(size, size);
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  const n = parseInt(tint.slice(1), 16);
  const [tr, tg, tb] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    d[i] = tr;
    d[i + 1] = tg;
    d[i + 2] = tb;
    d[i + 3] = Math.round((1 - lum) * (d[i + 3] / 255) * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ *
 * 7. Static layer — painted once, reused by every frame.
 *    Keeping this bit-identical across frames is what makes the delta
 *    encoder efficient.
 * ------------------------------------------------------------------ */

let CREST = null; // tinted institutional crest, resolved before first paint
let CREST_WATERMARK = null;

function paintStatic(ctx) {
  // Base wash
  const base = ctx.createLinearGradient(0, 0, W * 0.35, H);
  base.addColorStop(0, "#071624");
  base.addColorStop(0.55, C.bg);
  base.addColorStop(1, C.bgDeep);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Technical grid (42px — same cadence as .presentation-root::before)
  ctx.save();
  ctx.strokeStyle = "rgba(148,197,214,0.045)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 42) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 0; y <= H; y += 42) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  ctx.restore();

  // Brand glows (emerald top-right, cyan bottom-left) — matches the app shell
  const g1 = ctx.createRadialGradient(W * 0.88, H * 0.06, 0, W * 0.88, H * 0.06, 520);
  g1.addColorStop(0, rgba(C.emerald, 0.16));
  g1.addColorStop(1, rgba(C.emerald, 0));
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.05, H * 0.98, 0, W * 0.05, H * 0.98, 560);
  g2.addColorStop(0, rgba(C.cyan, 0.1));
  g2.addColorStop(1, rgba(C.cyan, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Vignette for depth
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  paintChrome(ctx);
  paintHero(ctx);
  paintPanelChrome(ctx);
  paintMetricChrome(ctx);
  paintFooter(ctx);
}

/* -- top bar ------------------------------------------------------- */

function paintChrome(ctx) {
  // Institutional crest in a hairline frame (.intro-logo-frame)
  ctx.save();
  roundRect(ctx, L.pad - 1, 23, 44, 44, 3);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = rgba(C.emerald, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  if (CREST) ctx.drawImage(CREST, L.pad + 3, 27, 36, 36);
  ctx.restore();

  ctx.fillStyle = C.text;
  ctx.font = `15px ${DISPLAY}`;
  tracked(ctx, "AAST", L.pad + 58, 42, 1.4);

  ctx.fillStyle = C.muted;
  ctx.font = `9.5px ${MONO_REG}`;
  tracked(ctx, "SUPPLY CHAIN CONTROL ROOM", L.pad + 58, 58, 1.5);

  // Right side meta
  ctx.textAlign = "left";
  ctx.font = `9.5px ${MONO_REG}`;
  ctx.fillStyle = C.muted;
  const vText = "v2.0.0";
  const vW = trackedWidth(ctx, vText, 1.2);
  tracked(ctx, vText, W - L.pad - 168 - vW - 18, 49, 1.2);

  // Status pill shell (the dot is animated per frame)
  roundRect(ctx, W - L.pad - 168, 30, 168, 30, 15);
  ctx.fillStyle = rgba(C.emerald, 0.07);
  ctx.fill();
  ctx.strokeStyle = rgba(C.emerald, 0.34);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = C.emerald;
  ctx.font = `9.5px ${MONO}`;
  tracked(ctx, "LIVE AUDIT LOOP", W - L.pad - 128, 49, 1.3);

  hLine(ctx, 0, W, L.topbar, C.line);
}

/* -- hero copy ----------------------------------------------------- */

function paintHero(ctx) {
  // eyebrow
  ctx.save();
  ctx.fillStyle = C.emerald;
  ctx.fillRect(L.pad, 126, 16, 2);
  ctx.fillStyle = C.muted;
  ctx.font = `10px ${MONO}`;
  tracked(ctx, "EXECUTIVE BRIEFING  //  2025 CONTROL MODEL", L.pad + 26, 131, 1.9);
  ctx.restore();

  // Wordmark
  ctx.save();
  ctx.font = `82px ${DISPLAY}`;
  const grad = ctx.createLinearGradient(L.pad, 150, L.pad + 520, 225);
  grad.addColorStop(0, "#9af7e2");
  grad.addColorStop(0.45, C.emerald);
  grad.addColorStop(1, C.cyan);
  ctx.fillStyle = grad;
  glow(ctx, rgba(C.emerald, 0.45), 26, () => tracked(ctx, "LOGISDATA", L.pad, 218, -0.5));
  ctx.restore();

  // Product line
  ctx.fillStyle = C.text;
  ctx.font = `25px ${DISPLAY_MED}`;
  tracked(ctx, "Supply-Chain Audit Control Room", L.pad, 256, 0.3);

  ctx.fillStyle = rgba(C.emerald, 0.75);
  ctx.fillRect(L.pad, 276, 96, 2);

  // Deck
  ctx.fillStyle = C.soft;
  ctx.font = `16px ${DISPLAY_MED}`;
  tracked(ctx, "Five synchronized 3D audit theatres on a single WebGL canvas:", L.pad, 310, 0.05);
  tracked(ctx, "freight billing, demand distortion, fleet routing, inventory truth.", L.pad, 336, 0.05);

  // Arabic signature line
  ctx.fillStyle = C.muted;
  ctx.font = `16px ${ARABIC}`;
  ctx.fillText("غرفة التحكم في سلسلة الإمداد — تدقيق تنفيذي ثنائي اللغة", L.pad, 376);

  // Stepper rail (segments are re-painted per frame; this is the ghost track)
  const seg = (L.rail.w - 4 * 8) / 5;
  ctx.fillStyle = "rgba(201,226,239,0.14)";
  for (let i = 0; i < 5; i++) ctx.fillRect(L.rail.x + i * (seg + 8), L.rail.y, seg, 3);
}

/* -- network panel chrome ------------------------------------------ */

function nodeXY(p) {
  const { x, y, w, h } = L.panel;
  const ix = x + 30;
  const iw = w - 60;
  const iy = y + 62;
  const ih = h - 124;
  return [ix + ((p[0] + 4.1) / 8.2) * iw, iy + ((2.95 - p[1]) / 4.2) * ih];
}

function paintPanelChrome(ctx) {
  const { x, y, w, h } = L.panel;

  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = "rgba(10,30,46,0.5)";
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Technical corner brackets
  ctx.save();
  ctx.strokeStyle = rgba(C.emerald, 0.55);
  ctx.lineWidth = 1.6;
  const b = 14;
  const corners = [
    [x, y, 1, 1], [x + w, y, -1, 1],
    [x, y + h, 1, -1], [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * b, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * b);
    ctx.stroke();
  }
  ctx.restore();

  // Panel header
  ctx.fillStyle = C.soft;
  ctx.font = `9.5px ${MONO}`;
  tracked(ctx, "SUPPLY SIGNAL GRAPH", x + 18, y + 26, 1.6);

  ctx.fillStyle = C.muted;
  ctx.font = `9.5px ${MONO_REG}`;
  const right = "08 NODES / 10 EDGES";
  tracked(ctx, right, x + w - 18 - trackedWidth(ctx, right, 1.2), y + 26, 1.2);
  hLine(ctx, x + 18, x + w - 18, y + 40, C.line);

  // Institutional watermark beneath the live graph
  if (CREST_WATERMARK) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    const ws = 214;
    ctx.drawImage(CREST_WATERMARK, x + (w - ws) / 2, y + 74, ws, ws);
    ctx.restore();
  }

  // Static edges
  ctx.save();
  ctx.strokeStyle = "rgba(125,211,252,0.34)";
  ctx.lineWidth = 1;
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  for (const [a, bId] of EDGES) {
    const [ax, ay] = nodeXY(byId[a].p);
    const [bx, by] = nodeXY(byId[bId].p);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();

  // Node labels (static), glyphs are animated
  ctx.fillStyle = C.muted;
  ctx.font = `8.5px ${MONO_REG}`;
  for (const n of NODES) {
    const [nx, ny] = nodeXY(n.p);
    const label = n.label;
    const lw = trackedWidth(ctx, label, 1);
    tracked(ctx, label, nx - lw / 2, ny + 23, 1);
  }

  // Legend
  const legend = [["VERIFIED", C.emerald], ["LEAK", C.red], ["PHANTOM", C.amber]];
  let lx = x + 18;
  ctx.font = `8.5px ${MONO_REG}`;
  for (const [label, color] of legend) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx + 3, y + h - 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.muted;
    const lw = trackedWidth(ctx, label, 1.1);
    tracked(ctx, label, lx + 12, y + h - 19, 1.1);
    lx += lw + 34;
  }
}

/* -- metric strip + footer ----------------------------------------- */

function metricCellX(i) {
  const total = W - L.pad * 2;
  const cw = total / METRICS.length;
  return { x: L.pad + i * cw, w: cw };
}

function paintMetricChrome(ctx) {
  hLine(ctx, L.pad, W - L.pad, L.divider, C.line);
  for (let i = 1; i < METRICS.length; i++) {
    const { x } = metricCellX(i);
    vLine(ctx, x - 18, L.metrics.y + 6, L.metrics.y + L.metrics.h - 4, C.line);
  }
  ctx.fillStyle = C.muted;
  ctx.font = `9px ${MONO_REG}`;
  METRICS.forEach((m, i) => {
    const { x } = metricCellX(i);
    tracked(ctx, m.label, x, L.metrics.y + 62, 1.35);
  });
}

function paintFooter(ctx) {
  hLine(ctx, L.pad, W - L.pad, L.footerRule, C.line);
  ctx.fillStyle = C.muted;
  ctx.font = `9.5px ${MONO_REG}`;
  tracked(ctx, "AHMED YASSER ALI  ·  REG 211010269  //  AAST EXECUTIVE DATA LAB", L.pad, 602, 1.4);
  const stack = "NEXT.JS 16 · REACT 19 · THREE.JS · TYPESCRIPT STRICT";
  const sw = trackedWidth(ctx, stack, 1.3);
  tracked(ctx, stack, W - L.pad - sw, 602, 1.3);
}

/* ------------------------------------------------------------------ *
 * 8. Animated layer
 * ------------------------------------------------------------------ */

/** Sweep travels across the card in the first 82% of the loop, then rests. */
function sweepX(t) {
  const u = clamp(t / 0.82);
  return lerp(-240, W + 260, u);
}

function paintSweep(ctx, sx) {
  if (sx < -200 || sx > W + 200) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const trail = ctx.createLinearGradient(sx - 182, 0, sx + 14, 0);
  trail.addColorStop(0, rgba(C.emerald, 0));
  trail.addColorStop(0.68, rgba(C.emerald, 0.05));
  trail.addColorStop(0.93, rgba(C.emerald, 0.17));
  trail.addColorStop(1, rgba(C.emerald, 0));
  ctx.fillStyle = trail;
  ctx.fillRect(sx - 182, L.topbar + 1, 196, L.footerRule - L.topbar - 1);

  ctx.fillStyle = rgba(C.cyan, 0.26);
  ctx.fillRect(sx - 5, L.topbar + 1, 1.4, L.footerRule - L.topbar - 1);

  ctx.shadowColor = rgba(C.emerald, 0.95);
  ctx.shadowBlur = 16;
  ctx.fillStyle = rgba(C.emerald, 0.92);
  ctx.fillRect(sx, L.topbar + 1, 1.8, L.footerRule - L.topbar - 1);
  ctx.restore();

  // Gate markers riding the rails
  ctx.save();
  ctx.fillStyle = C.emerald;
  ctx.beginPath();
  ctx.moveTo(sx - 5, L.topbar + 1);
  ctx.lineTo(sx + 6, L.topbar + 1);
  ctx.lineTo(sx + 0.5, L.topbar + 9);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 5, L.footerRule);
  ctx.lineTo(sx + 6, L.footerRule);
  ctx.lineTo(sx + 0.5, L.footerRule - 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The laser re-lights the wordmark as it crosses it. */
function paintWordmarkScan(ctx, sx) {
  if (sx < L.pad - 60 || sx > L.pad + 560) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - 92, 140, 112, 100);
  ctx.clip();
  ctx.font = `82px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  glow(ctx, rgba(C.emerald, 0.9), 22, () => tracked(ctx, "LOGISDATA", L.pad, 218, -0.5));
  ctx.restore();
}

function paintStatusDot(ctx, t) {
  const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 4);
  const x = W - L.pad - 148;
  const y = 45;
  ctx.save();
  ctx.fillStyle = rgba(C.emerald, 0.15 + 0.2 * pulse);
  ctx.beginPath();
  ctx.arc(x, y, 7 + pulse * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(C.emerald, 0.65 + 0.35 * pulse);
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintNetwork(ctx, t, sx) {
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const { x, y, w, h } = L.panel;

  // Panel scanline (slow vertical wipe, loops seamlessly)
  const scanY = y + 56 + ((t * (h - 100)) % (h - 100));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const sg = ctx.createLinearGradient(0, scanY - 34, 0, scanY + 10);
  sg.addColorStop(0, rgba(C.cyan, 0));
  sg.addColorStop(0.82, rgba(C.cyan, 0.08));
  sg.addColorStop(1, rgba(C.cyan, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(x + 1, scanY - 34, w - 2, 44);
  ctx.restore();

  // Packets in flight along every edge
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  EDGES.forEach(([a, bId], i) => {
    const [ax, ay] = nodeXY(byId[a].p);
    const [bx, by] = nodeXY(byId[bId].p);
    const phase = (t * 2 + i * 0.173) % 1;
    const leak = byId[a].status !== "verified" || byId[bId].status !== "verified";
    const color = leak ? C.amber : C.emerald;
    for (let k = 0; k < 5; k++) {
      const p = phase - k * 0.035;
      if (p < 0 || p > 1) continue;
      const px = lerp(ax, bx, p);
      const py = lerp(ay, by, p);
      ctx.fillStyle = rgba(color, (1 - k / 5) * 0.55);
      ctx.beginPath();
      ctx.arc(px, py, 2.4 - k * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();

  // Nodes — brighten as the audit gate crosses their column
  for (const n of NODES) {
    const [nx, ny] = nodeXY(n.p);
    const color = STATUS_COLOR[n.status];
    const prox = clamp(1 - Math.abs(sx - nx) / 150);
    const alive = n.status !== "verified";

    if (alive) {
      const ring = (t * 2 + noise(nx, ny)) % 1;
      ctx.save();
      ctx.strokeStyle = rgba(color, (1 - ring) * 0.5);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(nx, ny, 7 + ring * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = rgba(color, 0.9);
    ctx.shadowBlur = 10 + prox * 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(nx, ny, 5 + prox * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = rgba(color, 0.35 + prox * 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(nx, ny, 9.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function paintStepper(ctx, sx, frame) {
  const seg = (L.rail.w - 4 * 8) / 5;
  const onCard = sx > L.rail.x - 40 && sx < L.rail.x + L.rail.w + 40;
  const active = onCard ? clamp(Math.floor(((sx - L.rail.x) / L.rail.w) * 5), 0, 4) : -1;

  ctx.save();
  ctx.font = `9px ${MONO}`;
  for (let i = 0; i < 5; i++) {
    const x = L.rail.x + i * (seg + 8);
    const isActive = i === active;
    const passed = active === -1 ? false : i < active;
    const color = isActive ? C.emerald : passed ? rgba(C.emerald, 0.42) : "rgba(201,226,239,0.14)";

    if (isActive) {
      ctx.save();
      ctx.shadowColor = rgba(C.emerald, 0.8);
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.fillRect(x, L.rail.y - 1, seg, 5);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, L.rail.y, seg, 3);
    }

    ctx.fillStyle = isActive ? C.emerald : C.muted;
    tracked(ctx, `0${i + 1}`, x, L.rail.y - 10, 1.2);
  }

  ctx.font = `9.5px ${MONO}`;
  const label = active === -1 ? "AUDIT LOOP ARMED" : SECTIONS[active];
  ctx.fillStyle = active === -1 ? C.muted : C.soft;
  tracked(ctx, label, L.rail.x, L.rail.y + 24, 1.6);

  // Terminal caret trailing the active label
  if (frame % 2 === 0) {
    ctx.fillStyle = rgba(C.emerald, 0.8);
    ctx.fillRect(L.rail.x + trackedWidth(ctx, label, 1.6) + 8, L.rail.y + 16, 6, 9);
  }
  ctx.restore();
}

/**
 * Metric cells hold their true value and "re-verify" (digits roll) only while
 * the audit gate is on top of them, so the loop boundary is perfectly still.
 */
function paintMetrics(ctx, sx, frame) {
  METRICS.forEach((m, i) => {
    const { x, w } = metricCellX(i);
    const prox = clamp(1 - Math.abs(sx - (x + w * 0.35)) / 150);
    const scanning = prox > 0.08;

    let display = m.value;
    if (scanning && m.numeric) {
      display = m.value.replace(/\d/g, () => String(Math.floor(noise(frame * 3.3 + i, 7.7) * 10)));
    } else if (scanning) {
      display = frame % 2 === 0 ? "EN / AR" : m.value;
    }

    ctx.save();
    ctx.font = `37px ${DISPLAY}`;
    const tone = scanning ? C.text : m.tone;
    ctx.fillStyle = tone;
    if (scanning) {
      ctx.shadowColor = rgba(C.emerald, 0.75);
      ctx.shadowBlur = 16;
    } else {
      ctx.shadowColor = rgba(m.tone, 0.3);
      ctx.shadowBlur = 10;
    }
    tracked(ctx, display, x, L.metrics.y + 38, 0.2);
    ctx.restore();

    // Verification tick that fades after the gate has passed
    const after = clamp((sx - (x + w * 0.35)) / 190);
    if (after > 0.02 && after < 1) {
      const a = Math.sin(after * Math.PI) * 0.85;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.emerald;
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      const tx = x + 148;
      const ty = L.metrics.y + 26;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 4, ty + 5);
      ctx.lineTo(tx + 12, ty - 6);
      ctx.stroke();
      ctx.restore();
    }
  });
}

/* ------------------------------------------------------------------ *
 * 9. Frame composition
 * ------------------------------------------------------------------ */

const hiCanvas = createCanvas(W * SS, H * SS);
const hiCtx = hiCanvas.getContext("2d");
const bgCanvas = createCanvas(W * SS, H * SS);
const bgCtx = bgCanvas.getContext("2d");
const outCanvas = createCanvas(W, H);
const outCtx = outCanvas.getContext("2d");
outCtx.imageSmoothingEnabled = true;
outCtx.imageSmoothingQuality = "high";

CREST = await loadTintedCrest(144, C.text);
CREST_WATERMARK = await loadTintedCrest(428, C.cyan);
bgCtx.scale(SS, SS);
bgCtx.textBaseline = "alphabetic";
paintStatic(bgCtx);

function renderFrame(frame) {
  const t = frame / FRAMES;
  const sx = sweepX(t);

  hiCtx.setTransform(1, 0, 0, 1, 0, 0);
  hiCtx.clearRect(0, 0, W * SS, H * SS);
  hiCtx.drawImage(bgCanvas, 0, 0);
  hiCtx.scale(SS, SS);
  hiCtx.textBaseline = "alphabetic";
  hiCtx.textAlign = "left";

  paintNetwork(hiCtx, t, sx);
  paintStepper(hiCtx, sx, frame);
  paintMetrics(hiCtx, sx, frame);
  paintStatusDot(hiCtx, t);
  paintSweep(hiCtx, sx);
  paintWordmarkScan(hiCtx, sx);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(hiCanvas, 0, 0, W, H);
  return outCtx.getImageData(0, 0, W, H).data;
}

/* ------------------------------------------------------------------ *
 * 10. Quantisation, ordered dithering and delta GIF encoding
 * ------------------------------------------------------------------ */

const BAYER = (() => {
  const m = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  const out = new Float32Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[y * 8 + x] = m[y][x] / 64 - 0.5;
  return out;
})();

function buildPalette(sampleFrames) {
  const stride = 5; // every 5th pixel is plenty for a 255-colour fit
  const perFrame = Math.ceil((W * H) / stride);
  const buf = new Uint8Array(perFrame * sampleFrames.length * 4);
  let o = 0;
  for (const data of sampleFrames) {
    for (let p = 0; p < W * H; p += stride) {
      const i = p * 4;
      buf[o++] = data[i];
      buf[o++] = data[i + 1];
      buf[o++] = data[i + 2];
      buf[o++] = 255;
    }
  }
  return quantize(buf.subarray(0, o), 255, { format: "rgb565", oneBitAlpha: false, clearAlpha: false });
}

function makeMapper(palette) {
  const cache = new Int32Array(1 << 18).fill(-1); // 6 bits per channel
  const n = palette.length;
  return (r, g, b) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    const hit = cache[key];
    if (hit >= 0) return hit;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const c = palette[i];
      const dr = c[0] - r;
      const dg = c[1] - g;
      const db = c[2] - b;
      const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
      if (d < bestD) { bestD = d; best = i; }
    }
    cache[key] = best;
    return best;
  };
}

const DITHER = 9; // amplitude in 0-255 units; low enough to protect LZW runs

function mapFrame(data, mapper, out) {
  for (let y = 0; y < H; y++) {
    const row = (y & 7) * 8;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = BAYER[row + (x & 7)] * DITHER;
      const r = clamp(data[i] + d, 0, 255) | 0;
      const g = clamp(data[i + 1] + d, 0, 255) | 0;
      const b = clamp(data[i + 2] + d, 0, 255) | 0;
      out[y * W + x] = mapper(r, g, b);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 11. Build
 * ------------------------------------------------------------------ */

function writeStill(frame = STILL_FRAME) {
  renderFrame(frame);
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const png = outCanvas.toBuffer("image/png");
  writeFileSync(join(PUBLIC_DIR, "og-image.png"), png);
  return png.length;
}

function writeGif() {
  process.stdout.write("  · sampling colour space\n");
  const samples = [0, 7, 14, 21, 28, 34].map((f) => renderFrame(f));
  const palette = buildPalette(samples);
  const TRANSPARENT = palette.length;
  palette.push([0, 0, 0]);
  const mapper = makeMapper(palette.slice(0, TRANSPARENT));

  const gif = GIFEncoder();
  const cur = new Uint8Array(W * H);
  const prev = new Uint8Array(W * H);
  const outIdx = new Uint8Array(W * H);

  for (let f = 0; f < FRAMES; f++) {
    mapFrame(renderFrame(f), mapper, cur);
    if (f === 0) {
      outIdx.set(cur);
      gif.writeFrame(outIdx, W, H, { palette, delay: DELAY_MS, repeat: 0, dispose: 1, first: true });
    } else {
      let changed = 0;
      for (let p = 0; p < cur.length; p++) {
        if (cur[p] === prev[p]) {
          outIdx[p] = TRANSPARENT;
        } else {
          outIdx[p] = cur[p];
          changed++;
        }
      }
      gif.writeFrame(outIdx, W, H, {
        delay: DELAY_MS,
        dispose: 1,
        transparent: true,
        transparentIndex: TRANSPARENT,
      });
      if (f % 9 === 0) process.stdout.write(`  · frame ${String(f).padStart(2, "0")}/${FRAMES}  delta ${(changed / (W * H) * 100).toFixed(1)}%\n`);
    }
    prev.set(cur);
  }

  gif.finish();
  const bytes = gif.bytes();
  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(join(PUBLIC_DIR, "og-image-animated.gif"), bytes);
  return { size: bytes.length, colors: palette.length };
}

const stillOnly = process.argv.includes("--still-only");
const frameArg = process.argv.find((a) => a.startsWith("--frame="));
console.log(`\nLOGISDATA og-image renderer — ${W}x${H} @ ${SS}x supersample\n`);
const pngSize = writeStill(frameArg ? Number(frameArg.split("=")[1]) : STILL_FRAME);
console.log(`  ✓ og-image.png            ${(pngSize / 1024).toFixed(0)} KB`);
if (!stillOnly) {
  const { size, colors } = writeGif();
  console.log(`  ✓ og-image-animated.gif   ${(size / 1024).toFixed(0)} KB · ${FRAMES} frames · ${colors} colours · ${(FRAMES * DELAY_MS / 1000).toFixed(2)}s loop`);
}
console.log(`\n  output → ${PUBLIC_DIR}\n`);
