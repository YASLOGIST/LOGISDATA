#!/usr/bin/env node
/**
 * LOGISDATA × YASLOGIST — README cinematic hero renderer
 * ---------------------------------------------------------------------------
 * Renders, deterministically and without a browser:
 *
 *   assets/readme/yaslogist-hero.gif   1920×720 seamless loop (primary hero)
 *   assets/readme/yaslogist-hero.png   1920×720 static poster (fallback)
 *
 * Scene: the real supply graph from LOGISDATA/src/lib/data.ts (8 nodes,
 * 10 edges, verified / leak / phantom status) laid out as a floor plan in a
 * perspective control room. A slow orbital camera, an emerald audit gate
 * (the AuditScanner light curtain) sweeping the network, packets travelling
 * every edge, range rings on the floor and HUD read-outs that react to the
 * gate. Typography is the real Space Grotesk / JetBrains Mono, composited
 * as vectors — no generated lettering.
 *
 * Loop contract: every animated quantity is a periodic function of
 * t ∈ [0, 1). Event-driven state (audit tags, counters) fades out in Act IV
 * before t = 1, so the wrap step is indistinguishable from an interior step.
 *
 * GIF encoder (the part that matters for quality AND weight):
 *   1. One global palette: 9 pinned brand colours + 246 colours fitted by
 *      median cut and refined with k-means over a stratified frame sample.
 *      (The previous hero shipped a palette that mapped faint light shafts to
 *      saturated cyan; this encoder verifies its palette against the source.)
 *   2. 8×8 Bayer ordered dither — position-stable, so static regions produce
 *      identical indices frame-to-frame and compress to nothing.
 *   3. Inter-frame delta against what the decoder is *displaying*, with a
 *      small perceptual tolerance; unchanged pixels → transparent index,
 *      dispose = 1 (keep). Each frame is cropped to its dirty rectangle.
 *
 * Usage:
 *   npm run hero            # gif + poster
 *   npm run hero:poster     # poster only
 *   node render-hero.mjs --frame=48 --out=/tmp/f48.png   # inspect one frame
 */

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import gifenc from "gifenc";
import lzwEncode from "gifenc/src/lzwEncode.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { GIFEncoder } = gifenc;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

/* ───────────────────────── 1. Canvas & timing ───────────────────────── */

const W = 1920;
const H = 720;
const FRAMES = 120;
const DELAY_MS = 80; // 120 × 80 ms = 9.6 s loop
const POSTER_T = 0.5;

/* ───────────────────────── 2. Design tokens (globals.css) ───────────── */

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
};
const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex, a) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(4)})`;
};

/* ───────────────────────── 3. Typography ───────────────────────────── */

const FONT_ROOT = join(HERE, "node_modules", "@expo-google-fonts");
const reg = (pkg, file, alias) => GlobalFonts.registerFromPath(join(FONT_ROOT, pkg, file), alias);
reg("space-grotesk", "700Bold/SpaceGrotesk_700Bold.ttf", "SG Bold");
reg("space-grotesk", "600SemiBold/SpaceGrotesk_600SemiBold.ttf", "SG Semi");
reg("space-grotesk", "500Medium/SpaceGrotesk_500Medium.ttf", "SG Medium");
reg("space-grotesk", "400Regular/SpaceGrotesk_400Regular.ttf", "SG Regular");
reg("jetbrains-mono", "500Medium/JetBrainsMono_500Medium.ttf", "JBM Medium");
reg("jetbrains-mono", "400Regular/JetBrainsMono_400Regular.ttf", "JBM Regular");
reg("jetbrains-mono", "700Bold/JetBrainsMono_700Bold.ttf", "JBM Bold");

function text(ctx, str, x, y, { font, color, tracking = 0, align = "left", alpha = 1 }) {
  ctx.save();
  ctx.font = font;
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.textBaseline = "alphabetic";
  let w = ctx.measureText(str).width;
  // letterSpacing adds trailing space after the last glyph — remove it for alignment
  w -= tracking;
  const dx = align === "center" ? -w / 2 : align === "right" ? -w : 0;
  ctx.textAlign = "left";
  ctx.fillText(str, x + dx, y);
  ctx.restore();
  return w;
}
function measure(ctx, str, font, tracking = 0) {
  ctx.save();
  ctx.font = font;
  ctx.letterSpacing = `${tracking}px`;
  const w = ctx.measureText(str).width - tracking;
  ctx.restore();
  return w;
}

/* ───────────────────────── 4. Maths ─────────────────────────────────── */

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, x) => {
  const k = clamp((x - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const frac = (x) => x - Math.floor(x);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
/** periodic window around c with half-width w (cosine bell), wraps at 1 */
const bell = (t, c, w) => {
  let d = Math.abs(t - c);
  d = Math.min(d, 1 - d);
  return d >= w ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / w);
};

/* ───────────────────────── 5. Domain (src/lib/data.ts) ──────────────── */

const NODES = [
  { id: "port", label: "PORT", p: [-3.7, 1.1, 0], status: "verified" },
  { id: "yard", label: "YARD", p: [-2.0, -0.6, 0.1], status: "leak" },
  { id: "factory", label: "FACTORY", p: [-0.5, 1.65, -0.2], status: "verified" },
  { id: "crossdock", label: "CROSS-DOCK", p: [1.0, -0.8, 0.15], status: "phantom" },
  { id: "hub", label: "REGIONAL HUB", p: [2.25, 1.0, -0.1], status: "verified" },
  { id: "store", label: "STORE", p: [3.7, -0.35, 0], status: "leak" },
  { id: "returns", label: "RETURNS", p: [1.1, 2.15, 0.05], status: "phantom" },
  { id: "data", label: "DATA LAKE", p: [-1.35, 2.6, 0.1], status: "verified" },
];
const EDGES = [
  ["port", "yard"],
  ["yard", "factory"],
  ["factory", "crossdock"],
  ["crossdock", "hub"],
  ["hub", "store"],
  ["data", "factory"],
  ["data", "hub"],
  ["returns", "factory"],
  ["returns", "data"],
  ["yard", "data"],
];
const STATUS = {
  verified: { color: C.emerald, tag: "VERIFIED" },
  leak: { color: C.red, tag: "LEAK RISK" },
  phantom: { color: C.amber, tag: "PHANTOM SIGNAL" },
};
const THEATRES = ["HIDDEN COST", "INVOICE AUDIT", "BULLWHIP AUDIT", "ROUTE INTELLIGENCE", "WAREHOUSE CONTROL"];
const CHANNELS = [
  ["FREIGHT BILLING", "TELEMETRY"],
  ["CONSUMER DEMAND", "ORDERS"],
  ["PLANNED ROUTES", "GPS"],
  ["WMS MASTER DATA", "SHELF"],
];
const METRICS = [
  { value: "$2.1T", label: "GLOBAL WASTE", color: C.amber },
  { value: "3.8%", label: "INVOICE DISCREPANCY", color: C.red },
  { value: "6.4x", label: "AUDIT ROI", color: C.emerald },
];

// world placement: data x → X, data y → depth Z (floor plan), data z → height
const nodeById = {};
for (const n of NODES) {
  const [x, y, z] = n.p;
  n.w = [x * 1.06, 0.95 + z * 2.2, -(y - 0.95) * 1.32];
  nodeById[n.id] = n;
}

/* ───────────────────────── 6. Direction (acts & camera) ─────────────── */
/*
 *  ACT I    0.00–0.18  emergence  — calm baseline, title glint reveals identity
 *  ACT II   0.18–0.45  activation — gate enters, packets intensify, channels flip
 *  ACT III  0.45–0.74  system intelligence — gate crosses the hub side, flags lock
 *  ACT IV   0.74–1.00  brand resolution — tags settle out, YASLOGIST glint, rest
 */
const GATE_T0 = 0.18;
const GATE_T1 = 0.74;
const GATE_X0 = -5.8;
const GATE_X1 = 5.8;
// the gate is a vertical light curtain whose normal is yawed off the X axis,
// so the camera sees its face rather than its edge
const GATE_A = 0.62;
const GN = [Math.cos(GATE_A), 0, Math.sin(GATE_A)]; // sweep direction
const GD = [-Math.sin(GATE_A), 0, Math.cos(GATE_A)]; // span direction
const gateS = (P) => P[0] * GN[0] + P[2] * GN[2]; // signed position along sweep
const gatePt = (s, u, y = 0) => [GN[0] * s + GD[0] * u, y, -0.3 + GN[2] * s + GD[2] * u];
const RESOLVE_T0 = 0.82;
const RESOLVE_T1 = 0.94;

const activation = (t) => Math.pow(Math.sin(Math.PI * t), 2); // 0 at loop seam, 1 mid-loop
const gateProgress = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp((t - GATE_T0) / (GATE_T1 - GATE_T0)));
const gateX = (t) => lerp(GATE_X0, GATE_X1, gateProgress(t));
// the curtain materialises as it enters the network and dissolves as it leaves
const gateVis = (t) => {
  const x = gateX(t);
  return smooth(GATE_T0, GATE_T0 + 0.03, t) * (1 - smooth(GATE_T1 - 0.03, GATE_T1, t)) * smooth(-5.6, -4.3, x) * (1 - smooth(4.3, 5.6, x));
};
const resolve = (t) => 1 - smooth(RESOLVE_T0, RESOLVE_T1, t); // event state alive → fades out in Act IV

// time at which the gate crosses world X (numerically inverted, once)
function crossTime(x) {
  let lo = GATE_T0;
  let hi = GATE_T1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (gateX(mid) < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
for (const n of NODES) n.tc = crossTime(gateS([n.w[0], 0, n.w[2] + 0.3]));

function camera(t) {
  const target = [0, 0.75, -0.25];
  const CAMK = Number(process.env.CAMK ?? 0.6);
  const yaw = 0.075 * CAMK * Math.sin(TAU * t);
  const pitch = 0.43 + 0.018 * CAMK * Math.sin(TAU * t + 1.1);
  const R = 10.6 - 0.25 * CAMK * Math.sin(TAU * t - 0.6);
  const pos = [
    target[0] + R * Math.sin(yaw) * Math.cos(pitch),
    target[1] + R * Math.sin(pitch),
    target[2] + R * Math.cos(yaw) * Math.cos(pitch),
  ];
  const f = norm(sub(target, pos));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  return { pos, f, r, u, F: 1010, cx: 1318, cy: 352 };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
function project(cam, P) {
  const d = sub(P, cam.pos);
  const z = dot(d, cam.f);
  const x = dot(d, cam.r);
  const y = dot(d, cam.u);
  const s = cam.F / z;
  return { x: cam.cx + x * s, y: cam.cy - y * s, s, z };
}

/* ───────────────────────── 7. Layout constants ──────────────────────── */

const COL_X = 104; // left typographic column
const DIVIDER_X = 812;
const SCENE_L = 852;
const SCENE_R = 1824;

/* ───────────────────────── 8. Static layers (rendered once) ─────────── */

function renderBackground() {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  // base: deep navy, slightly lifted toward the scene
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#03090f");
  g.addColorStop(0.45, "#05101a");
  g.addColorStop(1, "#071725");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // volumetric bloom behind the network
  const bloom = (x, y, r, color, a) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rgba(color, a));
    rg.addColorStop(0.45, rgba(color, a * 0.38));
    rg.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  };
  bloom(1320, 380, 620, C.emerald, 0.085);
  bloom(1560, 250, 420, C.cyan, 0.05);
  bloom(260, 300, 520, C.cyan, 0.03);

  // horizon haze band (where the floor dissolves into fog)
  const hz = ctx.createLinearGradient(0, 150, 0, 330);
  hz.addColorStop(0, "rgba(125,211,252,0)");
  hz.addColorStop(0.55, "rgba(125,211,252,0.035)");
  hz.addColorStop(1, "rgba(125,211,252,0)");
  ctx.fillStyle = hz;
  ctx.fillRect(SCENE_L - 80, 150, W - SCENE_L + 80, 180);

  // overhead light cone onto the network
  ctx.save();
  ctx.filter = "blur(38px)";
  const cone = ctx.createLinearGradient(0, 0, 0, 560);
  cone.addColorStop(0, "rgba(77,225,193,0.07)");
  cone.addColorStop(1, "rgba(77,225,193,0)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(1250, 0);
  ctx.lineTo(1400, 0);
  ctx.lineTo(1700, 560);
  ctx.lineTo(950, 560);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // fine dot lattice on the text column (architectural texture)
  ctx.fillStyle = "rgba(168,190,203,0.045)";
  for (let y = 40; y < H - 30; y += 24) for (let x = 40; x < DIVIDER_X - 20; x += 24) ctx.fillRect(x, y, 1, 1);
  return cv;
}

function renderStaticOverlay() {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");

  // ── corner brackets
  ctx.strokeStyle = rgba(C.cyan, 0.42);
  ctx.lineWidth = 1.5;
  const b = 26;
  const m = 28;
  for (const [x, y, sx, sy] of [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * b);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * b, y);
    ctx.stroke();
  }

  // ── top HUD strip
  text(ctx, "LOGISDATA v3.1.0  ·  AUDIT MODEL  ·  ILLUSTRATIVE DATA", COL_X, 66, { font: "500 12px 'JBM Medium'", color: C.muted, tracking: 3 });
  text(ctx, "YASLOGIST  //  ENGINEERING SIGNATURE", SCENE_R, 66, { font: "500 12px 'JBM Medium'", color: C.soft, tracking: 3, align: "right" });
  ctx.fillStyle = C.emerald;
  ctx.beginPath();
  ctx.arc(SCENE_R + 18, 62, 3.2, 0, TAU);
  ctx.fill();

  // ── vertical divider between narrative column and the scene
  const dg = ctx.createLinearGradient(0, 110, 0, H - 80);
  dg.addColorStop(0, rgba(C.cyan, 0));
  dg.addColorStop(0.5, rgba(C.cyan, 0.22));
  dg.addColorStop(1, rgba(C.cyan, 0));
  ctx.fillStyle = dg;
  ctx.fillRect(DIVIDER_X, 110, 1, H - 190);
  for (let y = 150; y < H - 110; y += 40) {
    ctx.fillStyle = rgba(C.cyan, 0.18);
    ctx.fillRect(DIVIDER_X - 3, y, 7, 1);
  }

  // ── eyebrow
  ctx.fillStyle = C.emerald;
  ctx.beginPath();
  ctx.arc(COL_X + 5, 171, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(C.emerald, 0.18);
  ctx.beginPath();
  ctx.arc(COL_X + 5, 171, 11, 0, TAU);
  ctx.fill();
  text(ctx, "SUPPLY-CHAIN AUDIT CONTROL ROOM", COL_X + 26, 176, { font: "500 15px 'JBM Medium'", color: C.cyan, tracking: 4.2 });

  // ── statement
  text(ctx, "Freight, demand, routes and inventory —", COL_X, 388, { font: "29px 'SG Medium'", color: C.text, tracking: -0.2 });
  text(ctx, "four systems of record, reconciled on one canvas.", COL_X, 424, { font: "29px 'SG Regular'", color: C.soft, tracking: -0.2 });

  // ── channel scaffold (status pills animate per frame)
  CHANNELS.forEach(([a, b2], i) => {
    const y = 482 + i * 29;
    text(ctx, `0${i + 1}`, COL_X, y, { font: "500 13px 'JBM Medium'", color: C.cyan, tracking: 1 });
    const wa = text(ctx, a, COL_X + 36, y, { font: "500 13px 'JBM Medium'", color: C.soft, tracking: 1.6 });
    text(ctx, "×", COL_X + 36 + wa + 10, y, { font: "500 13px 'JBM Medium'", color: C.muted });
    text(ctx, b2, COL_X + 36 + wa + 28, y, { font: "500 13px 'JBM Medium'", color: C.soft, tracking: 1.6 });
    // leader dots
    ctx.fillStyle = rgba(C.muted, 0.35);
    for (let x = COL_X + 330; x < COL_X + 520; x += 6) ctx.fillRect(x, y - 4, 1.4, 1.4);
  });

  // ── YASLOGIST signature lockup (permanent, never animated away)
  const sy = 616;
  const rg = ctx.createLinearGradient(COL_X, 0, COL_X + 420, 0);
  rg.addColorStop(0, rgba(C.emerald, 0.85));
  rg.addColorStop(1, rgba(C.emerald, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(COL_X, sy, 420, 1.2);
  text(ctx, "ENGINEERED UNDER THE SIGNATURE OF", COL_X, sy + 26, { font: "500 11px 'JBM Medium'", color: C.muted, tracking: 3.4 });

  // ── metric cards (values are the illustrative model figures from data.ts)
  const cardY = 596;
  const cardW = 204;
  const cardH = 68;
  METRICS.forEach((mt, i) => {
    const x = SCENE_L + 34 + i * (cardW + 16);
    ctx.fillStyle = "rgba(6,18,29,0.82)";
    roundRect(ctx, x, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = rgba(mt.color, 0.32);
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 8);
    ctx.stroke();
    ctx.fillStyle = mt.color;
    ctx.beginPath();
    ctx.arc(x + 18, cardY + 26, 3, 0, TAU);
    ctx.fill();
    text(ctx, mt.value, x + 30, cardY + 35, { font: "26px 'SG Bold'", color: mt.color, tracking: -0.3 });
    text(ctx, mt.label, x + 18, cardY + 56, { font: "500 10.5px 'JBM Medium'", color: C.muted, tracking: 2 });
  });
  text(ctx, "ILLUSTRATIVE MODEL FIGURES", SCENE_L + 34, cardY - 12, { font: "500 10px 'JBM Medium'", color: rgba(C.muted, 0.8), tracking: 3 });

  // ── audit read-out frame (numbers animate)
  const rx = SCENE_L + 34 + 3 * (cardW + 16);
  ctx.fillStyle = "rgba(6,18,29,0.82)";
  roundRect(ctx, rx, cardY, SCENE_R - rx, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = rgba(C.cyan, 0.25);
  roundRect(ctx, rx + 0.5, cardY + 0.5, SCENE_R - rx - 1, cardH - 1, 8);
  ctx.stroke();
  text(ctx, "AUDIT GATE", rx + 18, cardY - 12, { font: "500 10px 'JBM Medium'", color: rgba(C.muted, 0.8), tracking: 3 });

  // ── five-theatre rail scaffold
  const railY = 118;
  const segW = (SCENE_R - SCENE_L - 34) / 5;
  THEATRES.forEach((name, i) => {
    const x = SCENE_L + 34 + i * segW;
    ctx.fillStyle = rgba(C.cyan, 0.14);
    ctx.fillRect(x, railY, segW - 10, 2);
    text(ctx, `0${i + 1}`, x, railY + 24, { font: "500 11px 'JBM Medium'", color: rgba(C.cyan, 0.75), tracking: 1.5 });
    text(ctx, name, x + 26, railY + 24, { font: "500 11px 'JBM Medium'", color: C.muted, tracking: 1.1 });
  });

  // ── bottom ruler
  const ry = 688;
  ctx.fillStyle = rgba(C.cyan, 0.18);
  ctx.fillRect(SCENE_L + 34, ry, SCENE_R - SCENE_L - 34, 1);
  for (let i = 0; i <= 96; i++) {
    const x = SCENE_L + 34 + (i * (SCENE_R - SCENE_L - 34)) / 96;
    const h = i % 8 === 0 ? 7 : 3;
    ctx.fillStyle = rgba(C.cyan, i % 8 === 0 ? 0.32 : 0.16);
    ctx.fillRect(Math.round(x), ry - h, 1, h);
  }
  return cv;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Title + signature are rendered on their own layers so a light glint can be
 * composited *inside* the glyphs (source-atop) without touching the rest. */
const TITLE = { str: "LOGISDATA", x: COL_X - 4, y: 306, size: 132 };
const SIG = { str: "YASLOGIST", x: COL_X, y: 680, size: 34, tracking: 10 };

function titleLayer(glintT) {
  const cv = createCanvas(W, 360);
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, TITLE.y - TITLE.size, 0, TITLE.y + 6);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#e4f3f9");
  g.addColorStop(1, "#9fc4d4");
  text(ctx, TITLE.str, TITLE.x, TITLE.y, { font: `${TITLE.size}px 'SG Bold'`, color: g, tracking: -2 });
  if (glintT !== null) glint(ctx, glintT, TITLE.x - 160, TITLE.x + 820, TITLE.y - TITLE.size, TITLE.y + 10);
  return cv;
}
function signatureLayer(glintT) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  const w = text(ctx, SIG.str, SIG.x, SIG.y, { font: `${SIG.size}px 'SG Semi'`, color: C.text, tracking: SIG.tracking });
  if (glintT !== null) glint(ctx, glintT, SIG.x - 80, SIG.x + w + 80, SIG.y - SIG.size, SIG.y + 6);
  // url sits beside the wordmark — always visible
  ctx.fillStyle = rgba(C.cyan, 0.5);
  ctx.fillRect(SIG.x + w + 22, SIG.y - 13, 1, 16);
  text(ctx, "yaslogist.com", SIG.x + w + 40, SIG.y - 1, { font: "500 14px 'JBM Medium'", color: C.cyan, tracking: 1.6 });
  return cv;
}
function glint(ctx, k, x0, x1, y0, y1) {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const cx = lerp(x0, x1, k);
  const band = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
  band.addColorStop(0, "rgba(77,225,193,0)");
  band.addColorStop(0.5, "rgba(190,255,240,0.95)");
  band.addColorStop(1, "rgba(77,225,193,0)");
  ctx.fillStyle = band;
  ctx.transform(1, 0, -0.35, 1, 0, 0); // shear for a diagonal sweep
  ctx.fillRect(cx - 90 + (y1 * 0.35), y0 - 4, 180, y1 - y0 + 8);
  ctx.restore();
}

/* ───────────────────────── 9. Dynamic scene ─────────────────────────── */

// deterministic dust motes in the scene volume
const MOTES = Array.from({ length: 70 }, (_, i) => ({
  base: [lerp(-6.5, 6.5, hash(i + 1)), lerp(0.2, 3.4, hash(i + 77)), lerp(-6, 3.5, hash(i + 191))],
  r: lerp(0.08, 0.3, hash(i + 13)),
  ph: hash(i + 29) * TAU,
  k: 1 + (i % 2),
  a: lerp(0.25, 0.75, hash(i + 5)),
}));

function drawFloor(ctx, cam, t) {
  const gx = gateX(t);
  const gv = gateVis(t);
  const step = 0.75;
  const fade = (X, Z) => {
    const r = Math.hypot(X / 8.5, (Z + 1.2) / 6.2);
    return clamp(1 - r) ** 1.6;
  };
  ctx.lineWidth = 1;
  const seg = (A, B, a) => {
    if (a < 0.008) return;
    const p = project(cam, A);
    const q = project(cam, B);
    ctx.strokeStyle = `rgba(125,211,252,${a.toFixed(4)})`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  };
  const N = 28;
  // lines of constant X (receding into depth)
  for (let X = -9; X <= 9.001; X += step) {
    for (let i = 0; i < N; i++) {
      const z0 = lerp(-8, 5, i / N);
      const z1 = lerp(-8, 5, (i + 1) / N);
      const f = fade(X, (z0 + z1) / 2);
      const boost = gv * Math.exp(-(((gateS([X, 0, (z0 + z1) / 2 + 0.3]) - gx) / 0.5) ** 2)) * 0.4;
      seg([X, 0, z0], [X, 0, z1], f * 0.15 + boost * f);
    }
  }
  // lines of constant Z
  for (let Z = -8; Z <= 5.001; Z += step) {
    for (let i = 0; i < N; i++) {
      const x0 = lerp(-9, 9, i / N);
      const x1 = lerp(-9, 9, (i + 1) / N);
      const xm = (x0 + x1) / 2;
      const f = fade(xm, Z);
      const boost = gv * Math.exp(-(((gateS([xm, 0, Z + 0.3]) - gx) / 0.5) ** 2)) * 0.4;
      seg([x0, 0, Z], [x1, 0, Z], f * 0.15 + boost * f);
    }
  }

  // range rings expanding from the network centre — one ring-spacing per loop
  const centre = [0, 0, -0.4];
  const spacing = 1.25;
  for (let k = 0; k < 7; k++) {
    const r = (k + t) * spacing;
    const env = Math.sin(Math.PI * clamp(r / (7 * spacing))) ** 1.5;
    const a = 0.16 * env;
    if (a < 0.01) continue;
    ctx.strokeStyle = rgba(C.emerald, a);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const ang = (i / 96) * TAU;
      const p = project(cam, [centre[0] + Math.cos(ang) * r * 1.25, 0, centre[2] + Math.sin(ang) * r]);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    // tick marks on each ring
    for (let j = 0; j < 12; j++) {
      const ang = (j / 12) * TAU;
      const p = project(cam, [centre[0] + Math.cos(ang) * r * 1.25, 0, centre[2] + Math.sin(ang) * r]);
      ctx.fillStyle = rgba(C.emerald, a * 2.2);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }
}

function arcPoints(a, b, n = 40) {
  const A = a.w;
  const B = b.w;
  const len = Math.hypot(B[0] - A[0], B[2] - A[2]);
  const lift = 0.35 + 0.12 * len;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([lerp(A[0], B[0], k), lerp(A[1], B[1], k) + Math.sin(Math.PI * k) * lift, lerp(A[2], B[2], k)]);
  }
  return pts;
}
const EDGE_PTS = EDGES.map(([a, b]) => arcPoints(nodeById[a], nodeById[b]));

function drawEdges(ctx, cam, t) {
  const act = activation(t);
  EDGES.forEach(([ia, ib], e) => {
    const pts = EDGE_PTS[e].map((P) => project(cam, P));
    const audited = Math.min(auditState(nodeById[ia], t), auditState(nodeById[ib], t));
    // base filament
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(C.cyan, 0.26);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    if (audited > 0.01) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(C.emerald, 0.38 * audited);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    // packets — integer laps per loop keeps them seamless
    const laps = 1 + (e % 2);
    const count = 2;
    for (let c = 0; c < count; c++) {
      const s = frac(t * laps + hash(e * 7 + 3) + c / count);
      drawPacket(ctx, EDGE_PTS[e], cam, s, 0.55 + 0.45 * act, e % 3 === 0 ? C.emerald : C.cyan);
    }
  });
}

function pointOn(pts, s) {
  const f = clamp(s) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k), lerp(pts[i][2], pts[i + 1][2], k)];
}

function drawPacket(ctx, pts3, cam, s, intensity, color) {
  // fade in/out at the ends of the edge so packets never pop
  const endFade = smooth(0, 0.08, s) * (1 - smooth(0.92, 1, s));
  const a = intensity * endFade;
  if (a < 0.02) return;
  const TAIL = 0.16;
  const STEPS = 8;
  for (let i = STEPS; i > 0; i--) {
    const s0 = s - (TAIL * i) / STEPS;
    const s1 = s - (TAIL * (i - 1)) / STEPS;
    if (s1 < 0) continue;
    const p = project(cam, pointOn(pts3, Math.max(0, s0)));
    const q = project(cam, pointOn(pts3, s1));
    ctx.strokeStyle = rgba(color, a * (1 - i / STEPS) * 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  const h = project(cam, pointOn(pts3, s));
  const r = 11 * (h.s / 95);
  const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
  g.addColorStop(0, rgba(color, 0.75 * a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(h.x, h.y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba("#eafffb", a);
  ctx.beginPath();
  ctx.arc(h.x, h.y, 2.2, 0, TAU);
  ctx.fill();
}

/** 0 before the gate reaches the node, eases to 1 after, fades out in Act IV */
function auditState(n, t) {
  return smooth(n.tc, n.tc + 0.035, t) * resolve(t);
}

const GATE_LAYER = createCanvas(W, H);
function drawGate(ctx, cam, t) {
  const gv = gateVis(t);
  if (gv < 0.005) return;
  const X = gateX(t);
  const U0 = 2.9; // back end (far, right)
  const U1 = -1.7; // front end (near, left)
  const Y1 = 2.05;
  const b0 = project(cam, gatePt(X, U0));
  const b1 = project(cam, gatePt(X, U1));
  const t0 = project(cam, gatePt(X, U0, Y1));
  const t1 = project(cam, gatePt(X, U1, Y1));
  // light curtain body — drawn on its own layer, then masked so both span
  // ends dissolve (no hard edges against the frame or the divider)
  const main = ctx;
  ctx = GATE_LAYER.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const yTop = Math.min(t0.y, t1.y);
  const yBot = Math.max(b0.y, b1.y);
  const g = ctx.createLinearGradient(0, yBot, 0, yTop);
  g.addColorStop(0, rgba(C.emerald, 0.3 * gv));
  g.addColorStop(0.5, rgba(C.emerald, 0.11 * gv));
  g.addColorStop(1, rgba(C.emerald, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(b0.x, b0.y);
  ctx.lineTo(b1.x, b1.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.lineTo(t0.x, t0.y);
  ctx.closePath();
  ctx.fill();

  // floor footprint glow
  const fp = (k) => project(cam, gatePt(X, lerp(U0, U1, k)));
  for (const [w, a] of [
    [9, 0.08],
    [4, 0.22],
    [1.6, 0.95],
  ]) {
    ctx.strokeStyle = rgba(C.emerald, a * gv);
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const p = fp(i / 24);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // front edge
  ctx.strokeStyle = rgba(C.emerald, 0.55 * gv);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(b1.x, b1.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.stroke();
  // travelling scan line (6 passes per loop)
  const sy = Y1 * (0.5 + 0.5 * Math.sin(TAU * t * 6));
  const s0 = project(cam, gatePt(X, U0, sy));
  const s1 = project(cam, gatePt(X, U1, sy));
  ctx.strokeStyle = rgba("#c9fff2", 0.5 * gv * (1 - 0.6 * (sy / Y1)));
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(s0.x, s0.y);
  ctx.lineTo(s1.x, s1.y);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  const m = ctx.createLinearGradient(b0.x, b0.y, b1.x, b1.y);
  m.addColorStop(0, "rgba(0,0,0,0)");
  m.addColorStop(0.22, "rgba(0,0,0,1)");
  m.addColorStop(0.78, "rgba(0,0,0,1)");
  m.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  main.drawImage(GATE_LAYER, 0, 0);
  ctx = main;

}

function drawNodes(ctx, cam, t) {
  const act = activation(t);
  const list = NODES.map((n) => ({ n, p: project(cam, n.w), f: project(cam, [n.w[0], 0, n.w[2]]) }));
  list.sort((a, b) => b.p.z - a.p.z); // painter's order: far → near
  for (const { n, p, f } of list) {
    const st = STATUS[n.status];
    const k = p.s / 95; // perspective scale (≈1 at mid-depth)
    const au = auditState(n, t);
    const isFlag = n.status !== "verified";

    // pin to floor + floor shadow
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(st.color, 0.32);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(1, 0.34);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 * k);
    sg.addColorStop(0, rgba(st.color, 0.3));
    sg.addColorStop(1, rgba(st.color, 0));
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * k, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(st.color, 0.4);
    ctx.lineWidth = 1.2 / 0.34;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * k, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // halo — flagged nodes pulse (3 beats per loop)
    const pulse = isFlag ? 0.5 + 0.5 * Math.sin(TAU * (t * 2) + n.w[0]) : 0.5;
    const haloR = (34 + 10 * pulse * (isFlag ? 1 : 0)) * k;
    const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
    hg.addColorStop(0, rgba(st.color, 0.48));
    hg.addColorStop(0.35, rgba(st.color, 0.12));
    hg.addColorStop(1, rgba(st.color, 0));
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, haloR, 0, TAU);
    ctx.fill();

    // ring + core
    ctx.strokeStyle = rgba(st.color, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 * k, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba("#03121a", 0.9);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10.5 * k, 0, TAU);
    ctx.fill();
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.6 * k, 0, TAU);
    ctx.fill();

    // crossing flash — expanding ring when the gate passes
    const dt = t - n.tc;
    if (dt >= 0 && dt < 0.08) {
      const q = dt / 0.08;
      ctx.strokeStyle = rgba(isFlag ? st.color : C.emerald, (1 - q) * 0.9);
      ctx.lineWidth = 2 * (1 - q) + 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (14 + 34 * easeOut(q)) * k, 0, TAU);
      ctx.stroke();
    }

    // reticle locks onto flagged nodes after audit
    if (isFlag && au > 0.01) {
      const R = (24 + 10 * (1 - au)) * k;
      const L = 7 * k;
      ctx.strokeStyle = rgba(st.color, 0.95 * au);
      ctx.lineWidth = 1.5;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(p.x + sx * R, p.y + sy * (R - L));
        ctx.lineTo(p.x + sx * R, p.y + sy * R);
        ctx.lineTo(p.x + sx * (R - L), p.y + sy * R);
        ctx.stroke();
      }
    }

    // label + status tag
    const lx = p.x + 18 * k + 6;
    const ly = p.y - 10 * k - 2;
    ctx.strokeStyle = rgba(C.soft, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + 9 * k, p.y - 7 * k);
    ctx.lineTo(lx - 3, ly + 4);
    ctx.stroke();
    text(ctx, n.label, lx, ly, { font: `500 ${Math.round(12 + 2 * k)}px 'JBM Medium'`, color: C.text, tracking: 1.6, alpha: 0.92 });
    if (au > 0.01) {
      const tag = st.tag;
      const tf = "500 10.5px 'JBM Medium'";
      const tw = measure(ctx, tag, tf, 1.6) + 16;
      ctx.save();
      ctx.globalAlpha = au;
      ctx.fillStyle = "rgba(4,14,22,0.9)";
      roundRect(ctx, lx - 1, ly + 7, tw + 14, 18, 4);
      ctx.fill();
      ctx.strokeStyle = rgba(st.color, 0.6);
      roundRect(ctx, lx - 0.5, ly + 7.5, tw + 13, 17, 4);
      ctx.stroke();
      // status glyph drawn as vectors (font-independent)
      ctx.strokeStyle = st.color;
      ctx.fillStyle = st.color;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (n.status === "verified") {
        ctx.moveTo(lx + 6, ly + 16);
        ctx.lineTo(lx + 9, ly + 19);
        ctx.lineTo(lx + 15, ly + 12);
        ctx.stroke();
      } else {
        ctx.moveTo(lx + 10.5, ly + 11);
        ctx.lineTo(lx + 15, ly + 20);
        ctx.lineTo(lx + 6, ly + 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      text(ctx, tag, lx + 22, ly + 20, { font: tf, color: st.color, tracking: 1.6, alpha: au });
    }
  }
}
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

function drawMotes(ctx, cam, t) {
  for (const m of MOTES) {
    const ang = TAU * t * m.k + m.ph;
    const P = [m.base[0] + Math.cos(ang) * m.r, m.base[1] + Math.sin(ang * 1) * m.r * 0.6, m.base[2] + Math.sin(ang) * m.r];
    const p = project(cam, P);
    if (p.x < SCENE_L || p.x > W - 40 || p.y < 100 || p.y > 640) continue;
    const a = m.a * clamp((p.s - 60) / 60) * 0.55;
    ctx.fillStyle = rgba(C.cyan, a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.7, p.s / 80), 0, TAU);
    ctx.fill();
  }
}

function drawHud(ctx, cam, t) {
  const gv = gateVis(t);
  const res = resolve(t);

  // five-theatre rail: progress travels 01 → 05 across the loop, then eases home
  const railY = 118;
  const segW = (SCENE_R - SCENE_L - 34) / 5;
  const prog = t * 5; // continuous
  for (let i = 0; i < 5; i++) {
    const x = SCENE_L + 34 + i * segW;
    const on = bell(frac(prog / 5), (i + 0.5) / 5, 0.16);
    const fill = clamp(prog - i);
    const fillA = (1 - smooth(0.9, 1.0, t)) * 0.75; // fill retracts at the seam
    ctx.fillStyle = rgba(C.emerald, fillA);
    ctx.fillRect(x, railY, (segW - 10) * fill, 2);
    if (on > 0.02) {
      ctx.fillStyle = rgba(C.emerald, on);
      ctx.beginPath();
      ctx.arc(x + (segW - 10) * clamp(prog - i), railY + 1, 3, 0, TAU);
      ctx.fill();
      text(ctx, THEATRES[i], x + 26, railY + 24, { font: "500 11px 'JBM Medium'", color: C.text, tracking: 1.1, alpha: on });
    }
  }

  // bottom ruler gate marker
  const ry = 688;
  if (gv > 0.01) {
    const gp = project(cam, gatePt(gateX(t), 1.2));
    const mx = clamp(gp.x, SCENE_L + 34, SCENE_R);
    ctx.fillStyle = rgba(C.emerald, gv);
    ctx.beginPath();
    ctx.moveTo(mx, ry - 2);
    ctx.lineTo(mx - 5, ry - 10);
    ctx.lineTo(mx + 5, ry - 10);
    ctx.closePath();
    ctx.fill();
    const pct = String(Math.round(gateProgress(t) * 100)).padStart(3, "0");
    text(ctx, `AUDIT PASS ${pct}%  ·  GATE ${gateX(t) >= 0 ? "+" : "−"}${Math.abs(gateX(t)).toFixed(2)}`, mx > SCENE_R - 260 ? mx - 10 : mx + 10, ry - 4, {
      align: mx > SCENE_R - 260 ? "right" : "left",
      font: "500 10px 'JBM Medium'",
      color: C.emerald,
      tracking: 1.4,
      alpha: gv,
    });
  }

  // audit read-out: counts tick as the gate crosses real nodes
  const cardY = 596;
  const cardW = 204;
  const rx = SCENE_L + 34 + 3 * (cardW + 16);
  let passed = 0;
  let verified = 0;
  let flagged = 0;
  for (const n of NODES) {
    if (t >= n.tc && t < RESOLVE_T0 + 0.06) {
      passed++;
      n.status === "verified" ? verified++ : flagged++;
    }
  }
  const cols = [
    ["NODES", `${passed}/8`, C.text],
    ["VERIFIED", `${verified}`, C.emerald],
    ["FLAGGED", `${flagged}`, C.red],
  ];
  const colW = (SCENE_R - rx - 20) / 3;
  const settle = t > RESOLVE_T0 ? res : 1;
  cols.forEach(([lab, val, col], i) => {
    const x = rx + 18 + i * colW;
    text(ctx, val, x, cardY + 36, { font: "24px 'SG Bold'", color: col, tracking: 0, alpha: lerp(0.35, 1, settle) });
    text(ctx, lab, x, cardY + 56, { font: "500 10px 'JBM Medium'", color: C.muted, tracking: 1.8 });
  });

  // metric card accent: top border glints as the gate passes above each card
  METRICS.forEach((mt, i) => {
    const x = SCENE_L + 34 + i * (cardW + 16);
    const gp = project(cam, gatePt(gateX(t), 1.2)).x;
    const near = gv * Math.exp(-(((gp - (x + cardW / 2)) / 110) ** 2));
    if (near < 0.02) return;
    const g = ctx.createLinearGradient(x, 0, x + cardW, 0);
    g.addColorStop(0, rgba(mt.color, 0));
    g.addColorStop(0.5, rgba(mt.color, 0.95 * near));
    g.addColorStop(1, rgba(mt.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x + 6, cardY, cardW - 12, 1.6);
  });

  // channel status pills (left column) — flip as the sweep progresses
  CHANNELS.forEach((_, i) => {
    const y = 482 + i * 29;
    const on = smooth(0.22 + i * 0.16, 0.26 + i * 0.16, gateProgress(t) * gv + (t > GATE_T1 ? 1 : 0)) * res;
    const x = COL_X + 530;
    // pending state
    text(ctx, "AWAITING", x + 16, y, { font: "500 12px 'JBM Medium'", color: C.muted, tracking: 1.8, alpha: 1 - on });
    text(ctx, "RECONCILED", x + 16, y, { font: "500 12px 'JBM Medium'", color: C.emerald, tracking: 1.8, alpha: on });
    ctx.fillStyle = rgba(C.muted, 0.6 * (1 - on));
    ctx.beginPath();
    ctx.arc(x + 4, y - 4, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(C.emerald, on);
    ctx.beginPath();
    ctx.arc(x + 4, y - 4, 3, 0, TAU);
    ctx.fill();
  });

  // loop timecode (truthful: it is the loop clock)
  const secs = t * FRAMES * DELAY_MS / 1000;
  text(ctx, `T+${secs.toFixed(2).padStart(5, "0")}s`, SCENE_R, 96, { font: "500 11px 'JBM Medium'", color: rgba(C.muted, 0.85), tracking: 2, align: "right" });
}

function drawVignette(ctx) {
  const v = ctx.createRadialGradient(W * 0.55, H * 0.5, H * 0.45, W * 0.55, H * 0.5, W * 0.72);
  v.addColorStop(0, "rgba(2,6,10,0)");
  v.addColorStop(1, "rgba(2,6,10,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/* ───────────────────────── 10. Frame composition ────────────────────── */

const BG = renderBackground();
const OVERLAY = renderStaticOverlay();
const TITLE_GLINT = (t) => (t >= 0.04 && t <= 0.2 ? (t - 0.04) / 0.16 : null); // Act I: identity reveal
const SIG_GLINT = (t) => (t >= 0.84 && t <= 0.96 ? (t - 0.84) / 0.12 : null); // Act IV: brand resolution
const TITLE_STATIC = titleLayer(null);
const SIG_STATIC = signatureLayer(null);

function renderFrame(t) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  ctx.drawImage(BG, 0, 0);
  const cam = camera(t);

  ctx.save();
  ctx.beginPath();
  ctx.rect(SCENE_L - 40, 80, W - SCENE_L + 40, 506);
  ctx.clip();
  drawFloor(ctx, cam, t);
  drawMotes(ctx, cam, t);
  drawGate(ctx, cam, t);
  drawEdges(ctx, cam, t);
  drawNodes(ctx, cam, t);
  ctx.restore();

  drawVignette(ctx);
  ctx.drawImage(OVERLAY, 0, 0);
  const tg = TITLE_GLINT(t);
  ctx.drawImage(tg === null ? TITLE_STATIC : titleLayer(tg), 0, 0);
  // accent rule under the title
  const rg = ctx.createLinearGradient(COL_X, 0, COL_X + 600, 0);
  rg.addColorStop(0, rgba(C.emerald, 0.95));
  rg.addColorStop(0.6, rgba(C.cyan, 0.35));
  rg.addColorStop(1, rgba(C.cyan, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(COL_X, 334, 600, 1.6);
  const sgk = SIG_GLINT(t);
  ctx.drawImage(sgk === null ? SIG_STATIC : signatureLayer(sgk), 0, 0);
  drawHud(ctx, cam, t);
  return cv;
}

/* ───────────────────────── 11. GIF encoder ──────────────────────────── */

const BAYER8 = (() => {
  const m = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ];
  return m.flat().map((v) => (v + 0.5) / 64 - 0.5);
})();
const DITHER_AMP = Number(process.env.DITHER ?? 4);
const TRANSPARENT = 255;
const PINNED = [C.bgDeep, C.bg, C.text, C.soft, C.muted, C.emerald, C.cyan, C.amber, C.red].map(hexRgb);

function buildPalette(sampleFrames) {
  // gather samples
  const samples = [];
  for (const data of sampleFrames) {
    for (let i = 0; i < data.length; i += 4 * 5) samples.push(data[i], data[i + 1], data[i + 2]);
  }
  const S = new Uint8Array(samples);
  const n = S.length / 3;
  const K = 255 - PINNED.length; // index 255 reserved for transparency
  // median cut
  let boxes = [{ idx: Uint32Array.from({ length: n }, (_, i) => i) }];
  const stats = (b) => {
    let mn = [255, 255, 255];
    let mx = [0, 0, 0];
    for (const i of b.idx) for (let c = 0; c < 3; c++) {
      const v = S[i * 3 + c];
      if (v < mn[c]) mn[c] = v;
      if (v > mx[c]) mx[c] = v;
    }
    const r = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    const ch = r.indexOf(Math.max(...r));
    b.ch = ch;
    b.score = r[ch] * Math.sqrt(b.idx.length);
  };
  stats(boxes[0]);
  while (boxes.length < K) {
    boxes.sort((a, b) => b.score - a.score);
    const b = boxes.shift();
    if (!b || b.idx.length < 2 || b.score === 0) {
      if (b) boxes.push(b);
      break;
    }
    const ch = b.ch;
    const arr = Array.from(b.idx).sort((x, y) => S[x * 3 + ch] - S[y * 3 + ch]);
    const mid = arr.length >> 1;
    const A = { idx: Uint32Array.from(arr.slice(0, mid)) };
    const B = { idx: Uint32Array.from(arr.slice(mid)) };
    stats(A);
    stats(B);
    boxes.push(A, B);
  }
  let centres = boxes.map((b) => {
    const s = [0, 0, 0];
    for (const i of b.idx) for (let c = 0; c < 3; c++) s[c] += S[i * 3 + c];
    return s.map((v) => v / b.idx.length);
  });
  // k-means refinement (pinned colours participate as fixed centres)
  const all = () => [...PINNED, ...centres];
  for (let it = 0; it < 5; it++) {
    const P = all();
    const acc = P.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i += 2) {
      const r = S[i * 3];
      const g = S[i * 3 + 1];
      const b = S[i * 3 + 2];
      let best = 0;
      let bd = 1e9;
      for (let j = 0; j < P.length; j++) {
        const dr = r - P[j][0];
        const dg = g - P[j][1];
        const db = b - P[j][2];
        const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      const a = acc[best];
      a[0] += r;
      a[1] += g;
      a[2] += b;
      a[3]++;
    }
    centres = centres.map((c, j) => {
      const a = acc[j + PINNED.length];
      return a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : c;
    });
  }
  const pal = all().map((c) => c.map((v) => Math.round(clamp(v, 0, 255))));
  while (pal.length < 255) pal.push([0, 0, 0]);
  pal.push([0, 0, 0]); // 255: transparent slot
  return pal;
}

function makeMapper(pal) {
  const lut = new Int16Array(1 << 18).fill(-1);
  const P = pal.slice(0, 255);
  return (r, g, b) => {
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let v = lut[key];
    if (v >= 0) return v;
    const R = (r & ~3) + 2;
    const G = (g & ~3) + 2;
    const B = (b & ~3) + 2;
    let bd = 1e9;
    for (let j = 0; j < P.length; j++) {
      const dr = R - P[j][0];
      const dg = G - P[j][1];
      const db = B - P[j][2];
      const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (d < bd) {
        bd = d;
        v = j;
      }
    }
    lut[key] = v;
    return v;
  };
}

function quantizeFrame(data, map) {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = (y & 7) * 8;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = BAYER8[row + (x & 7)] * DITHER_AMP;
      const o = i * 4;
      out[i] = map(clamp(data[o] + d, 0, 255) | 0, clamp(data[o + 1] + d, 0, 255) | 0, clamp(data[o + 2] + d, 0, 255) | 0);
    }
  }
  return out;
}

/* ───────────────────────── 12. Main ─────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });
const t0 = Date.now();

if (args.frame !== undefined) {
  const f = Number(args.frame);
  const out = args.out || join(HERE, `.frame-${f}.png`);
  writeFileSync(out, renderFrame(f / FRAMES).toBuffer("image/png"));
  console.log(`frame ${f} → ${out}`);
  process.exit(0);
}

// static poster — the most expressive moment of Act III, full colour
writeFileSync(join(OUT_DIR, "yaslogist-hero.png"), renderFrame(POSTER_T).toBuffer("image/png"));
console.log(`poster written (${Date.now() - t0} ms)`);
if (args["poster-only"]) process.exit(0);

// palette from a stratified sample of frames (all acts represented)
const sampleIdx = Array.from({ length: 16 }, (_, i) => Math.floor((i * FRAMES) / 16) + 3);
const sample = sampleIdx.map((f) => renderFrame(f / FRAMES).getContext("2d").getImageData(0, 0, W, H).data);
const palette = buildPalette(sample);
const map = makeMapper(palette);
console.log(`palette fitted (${Date.now() - t0} ms)`);

const TOL = Number(process.env.TOL ?? 12); // perceptual tolerance (palette L1 distance) for delta writes
const gif = GIFEncoder({ auto: false });
let shown = null; // indices the decoder is currently displaying
let written = 0;
const RUN_TOL = Number(process.env.RUN_TOL ?? 10);
const HEAT = process.env.HEAT ? new Uint16Array(W * H) : null;
for (let f = 0; f < FRAMES; f++) {
  const t = f / FRAMES;
  const data = renderFrame(t).getContext("2d").getImageData(0, 0, W, H).data;
  const q = quantizeFrame(data, map);
  if (!shown) {
    gif.writeHeader();
    gif.writeFrame(q, W, H, { first: true, palette, delay: DELAY_MS, repeat: 0, transparent: false, dispose: 1 });
    shown = q;
    written += W * H;
    continue;
  }
  const out = new Uint8Array(W * H);
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < W * H; i++) {
    const a = q[i];
    const b = shown[i];
    if (a === b) {
      out[i] = TRANSPARENT;
      continue;
    }
    const pa = palette[a];
    const pb = palette[b];
    const d = Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) + Math.abs(pa[2] - pb[2]);
    if (d <= TOL) {
      out[i] = TRANSPARENT;
      continue;
    }
    // run extension: reuse the left neighbour's index when it is perceptually
    // close, giving LZW longer runs (bounded error, never accumulates because
    // the delta is always measured against what the decoder displays)
    let v = a;
    const L = (i % W) > 0 ? out[i - 1] : TRANSPARENT;
    if (L !== TRANSPARENT && L !== a) {
      const pl = palette[L];
      if (Math.abs(pa[0] - pl[0]) + Math.abs(pa[1] - pl[1]) + Math.abs(pa[2] - pl[2]) <= RUN_TOL) v = L;
    }
    out[i] = v;
    shown[i] = v;
    if (HEAT) HEAT[i]++;
    const x = i % W;
    const y = (i / W) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) {
    x0 = y0 = 0;
    x1 = y1 = 0;
  }
  // crop to dirty rectangle
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const crop = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) crop.set(out.subarray((y + y0) * W + x0, (y + y0) * W + x0 + cw), y * cw);
  written += cw * ch;
  writeFrameAt(gif, crop, cw, ch, x0, y0);
  if (f % 20 === 0) console.log(`  frame ${f}/${FRAMES}  dirty ${cw}×${ch}`);
}
gif.finish();
if (HEAT) {
  const hc = createCanvas(W, H);
  const hx = hc.getContext("2d");
  const img = hx.createImageData(W, H);
  let tot = 0;
  for (let i = 0; i < W * H; i++) {
    const v = Math.min(255, (HEAT[i] / FRAMES) * 255 * 1.5);
    tot += HEAT[i];
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  hx.putImageData(img, 0, 0);
  writeFileSync(process.env.HEAT, hc.toBuffer("image/png"));
  console.log(`heat: avg writes/pixel/frame = ${(tot / FRAMES / (W * H)).toFixed(4)}`);
}
const bytes = gif.bytes();
writeFileSync(join(OUT_DIR, "yaslogist-hero.gif"), bytes);
console.log(`gif written: ${(bytes.length / 1e6).toFixed(2)} MB, ${FRAMES} frames, ${(Date.now() - t0) / 1000}s`);

/**
 * gifenc always positions frames at (0,0); this writes a cropped frame with a
 * proper image-descriptor offset using gifenc's own stream + LZW encoder.
 */
function writeFrameAt(enc, index, w, h, left, top) {
  const stream = enc.stream;
  // Graphic Control Extension: dispose = 1 (keep), transparency on
  stream.writeByte(0x21);
  stream.writeByte(0xf9);
  stream.writeByte(4);
  stream.writeByte((1 << 2) | 1);
  writeU16(stream, Math.round(DELAY_MS / 10));
  stream.writeByte(TRANSPARENT);
  stream.writeByte(0);
  // Image Descriptor at the dirty-rectangle offset, global palette
  stream.writeByte(0x2c);
  writeU16(stream, left);
  writeU16(stream, top);
  writeU16(stream, w);
  writeU16(stream, h);
  stream.writeByte(0);
  lzwEncode(w, h, index, 8, stream);
}
function writeU16(stream, v) {
  stream.writeByte(v & 0xff);
  stream.writeByte((v >> 8) & 0xff);
}
