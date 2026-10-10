#!/usr/bin/env node
/**
 * LOGISDATA × YASLOGIST — README secondary motion system
 * ---------------------------------------------------------------------------
 * GitHub renders README SVGs through <img>, which cannot load web fonts — any
 * <text> silently falls back to a system face. Every glyph below is therefore
 * outlined to <path> from the real Space Grotesk / JetBrains Mono files, so the
 * typography is identical on every machine. Motion is native SMIL (no script,
 * no CSS), which GitHub's image pipeline preserves.
 *
 *   assets/readme/kinetic-statement.svg   the four reconciliations, cycling
 *   assets/readme/focus-curve.svg         the real scene-focus curve, animated
 *   assets/readme/yaslogist-signature.svg closing brand signature
 *
 * (divider-pulse.svg contains no type and is maintained by hand.)
 *
 * Usage: npm run svg
 */

import opentype from "opentype.js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..");
const FR = join(HERE, "node_modules", "@expo-google-fonts");
const F = {
  sgSemi: opentype.loadSync(join(FR, "space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf")),
  sgMed: opentype.loadSync(join(FR, "space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf")),
  mono: opentype.loadSync(join(FR, "jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf")),
};

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

/** Outline a string with manual tracking + kerning. Returns { d, width }. */
function outline(font, str, x, y, size, { tracking = 0, anchor = "start" } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let w = 0;
  const adv = [];
  for (let i = 0; i < glyphs.length; i++) {
    let a = glyphs[i].advanceWidth * scale;
    if (i < glyphs.length - 1) a += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale + tracking;
    adv.push(a);
    w += a;
  }
  let cx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let d = "";
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(1);
    cx += adv[i];
  });
  return { d, width: w };
}
const P = (font, str, x, y, size, fill, opts = {}, attrs = "") => {
  const o = outline(font, str, x, y, size, opts);
  return { svg: `<path d="${o.d}" fill="${fill}"${attrs}/>`, width: o.width };
};

const plateDefs = (id, w, h) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.bgDeep}"/>
      <stop offset="1" stop-color="#071a2a"/>
    </linearGradient>`;

/* ───────────────────────── kinetic-statement.svg ───────────────────── */

function kinetic() {
  const W = 1200;
  const H = 88;
  const DUR = 12; // 4 statements × 3 s
  const items = [
    ["FREIGHT BILLING", "TELEMETRY", "billed vs. actual mileage · duplicate lines · rate overcharge"],
    ["CONSUMER DEMAND", "ORDER AMPLIFICATION", "the bullwhip measured tier by tier, consumer to supplier"],
    ["PLANNED ROUTES", "GPS REALITY", "five regions of route variance on one terrain"],
    ["WMS MASTER DATA", "PHYSICAL SHELF", "42 bins audited · mismatches located in place"],
  ];
  const n = items.length;
  const slot = 1 / n;
  const groups = items
    .map(([a, b, detail], i) => {
      const s = i * slot;
      // fade in 0.04, hold, fade out 0.04 — windows never overlap
      const kt = [0, s, s + 0.035, s + slot - 0.035, s + slot, 1].map((v) => Math.min(1, Math.max(0, v)));
      const op = [0, 0, 1, 1, 0, 0];
      const ty = [10, 10, 0, 0, -8, -8];
      const keyTimes = kt.map((v) => v.toFixed(4)).join(";");
      const x0 = 204;
      const pa = P(F.sgMed, a, x0, 47, 23, C.text, { tracking: 0.4 });
      const px = P(F.sgMed, "×", x0 + pa.width + 14, 47, 23, C.emerald);
      const pb = P(F.sgMed, b, x0 + pa.width + 42, 47, 23, C.text, { tracking: 0.4 });
      const pd = P(F.mono, detail.toUpperCase(), x0, 69, 11.5, C.muted, { tracking: 1.6 });
      const num = P(F.mono, `0${i + 1}`, 64, 47, 23, C.cyan);
      return `
  <g opacity="0">
    <animate attributeName="opacity" values="${op.join(";")}" keyTimes="${keyTimes}" dur="${DUR}s" repeatCount="indefinite"/>
    <animateTransform attributeName="transform" type="translate" values="${ty.map((v) => `0 ${v}`).join(";")}" keyTimes="${keyTimes}" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines="${Array(5).fill("0.4 0 0.2 1").join(";")}"/>
    ${num.svg}
    ${pa.svg}${px.svg}${pb.svg}
    ${pd.svg}
  </g>`;
    })
    .join("");

  const label = P(F.mono, "RECONCILIATION", 64, 74, 9.5, C.muted, { tracking: 2.4 });
  const of4 = P(F.mono, "/ 04", 104, 47, 13, C.muted, { tracking: 1 });

  // four-segment progress rail: each segment fills during its own window
  const segX = 860;
  const segW = 72;
  const segs = items
    .map((_, i) => {
      const s = i * slot;
      const x = segX + i * (segW + 8);
      const kt = [0, s, s + slot - 0.02, 1].map((v) => Math.min(1, v).toFixed(4)).join(";");
      return `
  <rect x="${x}" y="43" width="${segW}" height="2" fill="${C.cyan}" fill-opacity="0.16"/>
  <rect x="${x}" y="43" width="0" height="2" fill="${C.emerald}">
    <animate attributeName="width" values="0;0;${segW};${segW}" keyTimes="${kt}" dur="${DUR}s" repeatCount="indefinite"/>
  </rect>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Animated technical statement cycling through the four reconciliations LOGISDATA audits: freight billing versus telemetry, consumer demand versus order amplification, planned routes versus GPS reality, WMS master data versus the physical shelf">
  <title>LOGISDATA — the four reconciliations</title>
  <defs>${plateDefs("ks-plate", W, H)}
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#ks-plate)" stroke="${C.emerald}" stroke-opacity="0.2"/>
  <rect x="28" y="22" width="3" height="44" rx="1.5" fill="${C.emerald}">
    <animate attributeName="fill-opacity" values="1;0.35;1" dur="3s" repeatCount="indefinite"/>
  </rect>
  ${label.svg}
  ${of4.svg}
  ${groups}
  ${segs}
  <circle cx="${segX + 4 * (segW + 8) + 14}" cy="44" r="3.5" fill="${C.emerald}">
    <animate attributeName="r" values="3.5;6;3.5" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="fill-opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite"/>
  </circle>
</svg>
`;
}

/* ───────────────────────── focus-curve.svg ─────────────────────────── */
/* Visualises src/lib/sceneFocus.ts + IndustrialScene exactly:
 *   focus(p, i) = clamp(1 − |p − i| / 1.08, 0, 1)
 *   group scale = 0.56 + 0.44 · focus           (before the explode factor)
 *   label opacity = focus, hidden below 0.05     (applyLabelFocus)            */

function focusCurve() {
  const W = 1200;
  const H = 330;
  const SPREAD = 1.08;
  const BASE = 0.56;
  const GAIN = 0.44;
  const N = 5;
  const DUR = 16;
  const x0 = 150;
  const x1 = 1040;
  const yBase = 214;
  const yTop = 104;
  const px = (p) => x0 + (p / (N - 1)) * (x1 - x0);
  const fy = (f) => yBase - f * (yBase - yTop);
  const focus = (p, i) => Math.max(0, Math.min(1, 1 - Math.abs(p - i) / SPREAD));
  const names = ["HIDDEN COST", "INVOICE AUDIT", "BULLWHIP AUDIT", "ROUTE INTELLIGENCE", "WAREHOUSE CONTROL"];

  // scroll position timeline: dwell on each section, smoothstep between them, 0→4→0
  const stops = [0, 1, 2, 3, 4, 3, 2, 1];
  const K = 160;
  const pAt = (k) => {
    const u = (k / K) * stops.length;
    const seg = Math.floor(u) % stops.length;
    const local = u - Math.floor(u);
    const a = stops[seg];
    const b = stops[(seg + 1) % stops.length];
    const m = Math.max(0, Math.min(1, (local - 0.45) / 0.55)); // dwell 45 %, travel 55 %
    const e = m * m * (3 - 2 * m);
    return a + (b - a) * e;
  };
  const ps = Array.from({ length: K + 1 }, (_, k) => pAt(k));
  const kt = ps.map((_, k) => (k / K).toFixed(4)).join(";");
  const anim = (attr, vals) => `<animate attributeName="${attr}" values="${vals.map((v) => v.toFixed(2)).join(";")}" keyTimes="${kt}" dur="${DUR}s" repeatCount="indefinite"/>`;

  // static tents
  let tents = "";
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - SPREAD);
    const b = Math.min(N - 1, i + SPREAD);
    const pts = [
      [a, focus(a, i)],
      [i, 1],
      [b, focus(b, i)],
    ];
    const d = pts.map(([p, f], j) => `${j ? "L" : "M"}${px(p).toFixed(1)} ${fy(f).toFixed(1)}`).join(" ");
    tents += `<path d="${d} L${px(b).toFixed(1)} ${yBase} L${px(a).toFixed(1)} ${yBase} Z" fill="url(#fc-tent)"/>`;
    tents += `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-opacity="0.55" stroke-width="1.4"/>`;
  }

  // gridlines + axis ticks
  let grid = "";
  for (const f of [0.25, 0.5, 0.75, 1]) {
    grid += `<line x1="${x0}" x2="${x1}" y1="${fy(f)}" y2="${fy(f)}" stroke="${C.cyan}" stroke-opacity="0.07"/>`;
  }
  grid += P(F.mono, "1.0", x0 - 14, fy(1) + 4, 10, C.muted, { anchor: "end" }).svg;
  grid += P(F.mono, "0.5", x0 - 14, fy(0.5) + 4, 10, C.muted, { anchor: "end" }).svg;
  grid += P(F.mono, "0", x0 - 14, yBase + 4, 10, C.muted, { anchor: "end" }).svg;
  // the 0.05 label-hide threshold
  grid += `<line x1="${x0}" x2="${x1}" y1="${fy(0.05)}" y2="${fy(0.05)}" stroke="${C.amber}" stroke-opacity="0.35" stroke-dasharray="3 5"/>`;
  grid += P(F.mono, "LABEL HIDE", x1 + 22, fy(0.05) - 6, 9, C.amber, { tracking: 1.4 }, ` fill-opacity="0.85"`).svg;
  grid += P(F.mono, "< 0.05", x1 + 22, fy(0.05) + 10, 9, C.amber, { tracking: 1.4 }, ` fill-opacity="0.85"`).svg;

  // per-section moving parts
  let dots = "";
  let labels = "";
  let bars = "";
  for (let i = 0; i < N; i++) {
    const fs = ps.map((p) => focus(p, i));
    const cy = fs.map((f) => fy(f));
    const cx = ps.map((p) => px(p));
    // dot rides its tent at the current scroll position (only visible while on it)
    dots += `<circle r="5" fill="${C.emerald}" stroke="${C.bgDeep}" stroke-width="2">${anim("cx", cx)}${anim("cy", cy)}${anim("opacity", fs.map((f) => (f > 0 ? 1 : 0)))}</circle>`;

    // section label beneath its peak: opacity = focus, exactly like applyLabelFocus
    const lx = px(i);
    const num = P(F.mono, `0${i + 1}`, lx, yBase + 26, 11, C.cyan, { anchor: "middle", tracking: 1 });
    const nm = P(F.mono, names[i], lx, yBase + 42, 10, C.text, { anchor: "middle", tracking: 1.4 });
    const nmMuted = P(F.mono, names[i], lx, yBase + 42, 10, C.muted, { anchor: "middle", tracking: 1.4 });
    labels += `${num.svg}<g opacity="0.35">${nmMuted.svg}</g><g>${anim("opacity", fs.map((f) => (f < 0.05 ? 0 : f)))}${nm.svg}</g>`;

    // scene group scale bar: 0.56 + 0.44 · focus
    const bx = lx - 34;
    const by = yBase + 60;
    const bw = 68;
    bars += `<rect x="${bx}" y="${by}" width="${bw}" height="6" rx="3" fill="${C.cyan}" fill-opacity="0.1"/>`;
    bars += `<rect x="${bx}" y="${by}" width="${bw * BASE}" height="6" rx="3" fill="${C.emerald}" fill-opacity="0.85">${anim(
      "width",
      fs.map((f) => bw * (BASE + GAIN * f)),
    )}</rect>`;
  }

  // scroll cursor
  const cxs = ps.map((p) => px(p));
  const cursor = `<g>
    <line y1="${yTop - 18}" y2="${yBase}" stroke="${C.emerald}" stroke-width="1.4">${anim("x1", cxs)}${anim("x2", cxs)}</line>
    <path d="M -6 0 L 6 0 L 0 8 Z" fill="${C.emerald}"><animateTransform attributeName="transform" type="translate" values="${cxs
      .map((x) => `${x.toFixed(2)} ${yTop - 26}`)
      .join(";")}" keyTimes="${kt}" dur="${DUR}s" repeatCount="indefinite"/></path>
  </g>`;

  const title = P(F.mono, "SCENE FOCUS", 36, 44, 12, C.cyan, { tracking: 3 });
  const formula = P(F.mono, "focus(p, i) = clamp(1 − |p − i| ÷ 1.08)", 36, 70, 15, C.text, { tracking: 0.4 });
  const scaleNote = P(F.mono, "GROUP SCALE = 0.56 + 0.44 · focus", W - 36, 44, 11, C.soft, { anchor: "end", tracking: 1.6 });
  const pNote = P(F.mono, "p = scroll offset × (5 − 1)", W - 36, 70, 11, C.muted, { anchor: "end", tracking: 1.6 });
  const barsLabel = P(F.mono, "SCALE", 36, yBase + 66, 9.5, C.muted, { tracking: 2 });
  const src = P(F.mono, "SOURCE · src/lib/sceneFocus.ts · IndustrialScene.tsx", 36, H - 18, 9.5, C.muted, { tracking: 1.6 });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Animated plot of the LOGISDATA scene-focus curve: as the scroll position moves across the five sections, each section's focus rises and falls along a triangular curve of half-width 1.08; label opacity follows focus and hides below 0.05, and each 3D group scales between 0.56 and 1.0">
  <title>LOGISDATA — scene focus curve (sceneFocus.ts)</title>
  <defs>${plateDefs("fc-plate", W, H)}
    <linearGradient id="fc-tent" x1="0" y1="${yTop}" x2="0" y2="${yBase}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.cyan}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#fc-plate)" stroke="${C.emerald}" stroke-opacity="0.2"/>
  ${title.svg}
  ${formula.svg}
  ${scaleNote.svg}
  ${pNote.svg}
  ${grid}
  <line x1="${x0}" x2="${x1}" y1="${yBase}" y2="${yBase}" stroke="${C.cyan}" stroke-opacity="0.35"/>
  ${tents}
  ${cursor}
  ${dots}
  ${labels}
  ${barsLabel.svg}
  ${bars}
  ${src.svg}
</svg>
`;
}

/* ───────────────────────── yaslogist-signature.svg ─────────────────── */

function signature() {
  const W = 960;
  const H = 200;
  const DUR = 8;
  const word = outline(F.sgSemi, "YASLOGIST", W / 2, 116, 60, { tracking: 17, anchor: "middle" });
  const over = P(F.mono, "LOGISDATA   ×   ENGINEERING SIGNATURE", W / 2, 60, 11.5, C.muted, { anchor: "middle", tracking: 4.2 });
  const url = P(F.mono, "yaslogist.com", W / 2, 166, 14, C.cyan, { anchor: "middle", tracking: 2.6 });
  const half = 170;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="YASLOGIST — permanent engineering signature, yaslogist.com">
  <title>YASLOGIST — engineering signature</title>
  <defs>${plateDefs("sg-plate", W, H)}
    <linearGradient id="sg-word" x1="0" y1="66" x2="0" y2="118" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#a9cad8"/>
    </linearGradient>
    <linearGradient id="sg-glint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#bfffee" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#bfffee" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#bfffee" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sg-rule-r" x1="${W / 2}" y1="0" x2="${W / 2 + half}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.emerald}"/>
      <stop offset="1" stop-color="${C.emerald}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sg-rule-l" x1="${W / 2}" y1="0" x2="${W / 2 - half}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${C.emerald}"/>
      <stop offset="1" stop-color="${C.emerald}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="sg-clip"><path d="${word.d}"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="url(#sg-plate)" stroke="${C.emerald}" stroke-opacity="0.22"/>
  <g stroke="${C.cyan}" stroke-opacity="0.5" stroke-width="1.4" fill="none">
    <path d="M 28 52 L 28 28 L 52 28"/>
    <path d="M ${W - 28} 52 L ${W - 28} 28 L ${W - 52} 28"/>
    <path d="M 28 ${H - 52} L 28 ${H - 28} L 52 ${H - 28}"/>
    <path d="M ${W - 28} ${H - 52} L ${W - 28} ${H - 28} L ${W - 52} ${H - 28}"/>
  </g>
  ${over.svg}
  <!-- wordmark: always fully visible; only a glint travels inside the glyphs -->
  <path d="${word.d}" fill="url(#sg-word)"/>
  <g clip-path="url(#sg-clip)">
    <rect x="-140" y="60" width="140" height="70" fill="url(#sg-glint)" transform="skewX(-20)">
      <animate attributeName="x" values="-140;-140;${W + 120};${W + 120}" keyTimes="0;0.55;0.8;1" dur="${DUR}s" repeatCount="indefinite"/>
    </rect>
  </g>
  <!-- rule draws out from the centre, holds, retracts -->
  <rect x="${W / 2}" y="134" width="0" height="1.6" fill="url(#sg-rule-r)">
    <animate attributeName="width" values="0;${half};${half};0" keyTimes="0;0.25;0.85;1" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1"/>
  </rect>
  <rect x="${W / 2}" y="134" width="0" height="1.6" fill="url(#sg-rule-l)">
    <animate attributeName="x" values="${W / 2};${W / 2 - half};${W / 2 - half};${W / 2}" keyTimes="0;0.25;0.85;1" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1"/>
    <animate attributeName="width" values="0;${half};${half};0" keyTimes="0;0.25;0.85;1" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1"/>
  </rect>
  <circle cx="${W / 2}" cy="134.8" r="2.6" fill="${C.emerald}"/>
  ${url.svg}
</svg>
`;
}

writeFileSync(join(OUT, "kinetic-statement.svg"), kinetic());
writeFileSync(join(OUT, "focus-curve.svg"), focusCurve());
writeFileSync(join(OUT, "yaslogist-signature.svg"), signature());
console.log("svg written: kinetic-statement.svg, focus-curve.svg, yaslogist-signature.svg");
