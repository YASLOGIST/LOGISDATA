# LOGISDATA Control Room — Architecture and Behavioural Specification

This document is written to be **sufficient to rebuild the application from scratch**. Every statement is labelled:

- **CONFIRMED** — verified by reading the code, running it, or an executing test.
- **INFERRED** — a reasoned conclusion from the evidence, with the confidence stated.

---

## 1. Scope and classification

**CONFIRMED.** A client-rendered, statically prerendered single-page presentation with a secondary document route. There is no CMS, no authentication, no user data, no analytics and no outbound network call at runtime. All content ships inside the JavaScript bundle as typed bilingual literals.

| Facet | Value |
|---|---|
| Framework | Next.js 16.3.7, App Router, Turbopack |
| UI runtime | React 19.2.6 |
| 3D | three ^0.185 · @react-three/fiber ^9.7 · @react-three/drei ^10.7 |
| Animation | framer-motion ^12.43 (deck only — **not** the cover) |
| Styling | Tailwind CSS 4.1 (CSS-first `@theme`) + a hand-written design layer in `globals.css` |
| Data layer | drizzle-orm + `pg`, lazily instantiated and entirely optional |
| Language | TypeScript 5.9, `strict` |
| Runtime floor | Node.js 22 (`engines`, `.nvmrc`) |
| Source size | ~4,300 lines under `src/`, ~1,700 lines under `tests/` |

**Definition of success** (the measurable contract this build is held to):

1. A visitor on any device gets the full audit content — WebGL or not, motion or not, English or Arabic.
2. The cover screen never pays for the 3D runtime.
3. Scene state and document state are provably the same state (locked by tests, not by eyeballing).
4. Every quality property — types, lint, unit, e2e, accessibility, payload, dependency security — is machine-enforced in CI.

---

## 2. Runtime architecture

```text
                      ┌───────────────────────────────┐
  request /           │ app/layout.tsx  (server)      │
 ─────────────────▶   │  · font, metadata, JSON-LD    │
                      │  · pre-hydration theme script │
                      │  · PreferencesProvider        │
                      └───────────────┬───────────────┘
                                      │
                      ┌───────────────▼───────────────┐
                      │ PresentationShell  (client)   │
                      │  probeDevice() → DeviceProfile│
                      └───┬───────────┬───────────┬───┘
            tier="none"   │           │ hydrated  │ render error
         ┌────────────────▼──┐  ┌─────▼────────┐  ┌▼─────────────────┐
         │ no-WebGL notice   │  │ EngineLoader │  │ ErrorBoundary    │
         │ + link to /handout│  │ (until probe)│  │ retry / handout  │
         └───────────────────┘  └─────┬────────┘  └──────────────────┘
                                      │ probe says WebGL is available
                      ┌───────────────▼──────────────────────────────┐
                      │ next/dynamic → Presentation.tsx   (ssr:false)│
                      │  ── the ONLY module that imports three ──    │
                      └───────────────┬──────────────────────────────┘
                                      │
          ┌───────────────────────────┴──────────────────────────────┐
          │                                                          │
┌─────────▼──────────────┐                            ┌──────────────▼───────────┐
│ <Canvas> IndustrialScene│  ◀── one scroll offset ──▶ │ scrollable HTML sections │
│  one camera rig         │        (single source)     │  Hero/Audit/Demand/      │
│  5 child scenes         │                            │  Routes/Warehouse        │
│  DataStreamField        │                            │  + GlassCard + export    │
└─────────────────────────┘                            └──────────────────────────┘
```

**CONFIRMED.** `Presentation.tsx` is the sole importer of `three`, `@react-three/fiber`, `@react-three/drei` and `framer-motion` on the `/` route, and it is loaded through `next/dynamic` with `ssr: false`.

There is **no cover screen**: the deck opens directly in the control room. The shell still holds the loader until the capability probe has run, so a device without WebGL is shown the text fallback without ever requesting the 1 MB 3D chunk. `tests/e2e/smoke.spec.ts` asserts that the server-rendered document stays a small static shell (< 40 kB, no `WebGLRenderer`), and `tests/e2e/performance.spec.ts` enforces the total JavaScript ceiling for the route.

Because the deck is client-rendered, `layout.tsx` carries a bilingual `<noscript>` block linking to `/handout`; it is the only path to the content with scripting disabled, a role the server-rendered cover used to fill.

### 2.1 The scroll ⇄ scene contract

This is the single most important invariant in the application.

**CONFIRMED.** drei's `<ScrollControls pages={N}>` makes the scroll container `N` viewport heights tall, so the scrollable distance is `N − 1` viewports and `scroll.offset ∈ [0,1]` maps to a *page position* of `offset × (N − 1)`, not `offset × N`.

```ts
// lib/sections.ts
export const SECTION_COUNT = 5;
export function pagePositionFromOffset(offset: number): number {
  return clamp01(offset) * (SECTION_COUNT - 1);   // 0 … 4
}
```

```ts
// lib/sceneFocus.ts
export const FOCUS_SPREAD = 1.08;
export function getSectionFocus(pagePosition: number, index: number): number {
  const distance = Math.abs(pagePosition - index);
  return Math.max(0, 1 - distance / FOCUS_SPREAD);  // 1 at the section, 0 away
}
export function getActiveSectionIndex(pagePosition: number): number {
  return clampSectionIndex(Math.round(pagePosition));
}
```

Section *i* therefore peaks at `offset = i / 4`, i.e. **0.00, 0.25, 0.50, 0.75, 1.00** — exactly where the HTML section tops sit. Locked by `tests/unit/sections.test.ts` and `tests/unit/sceneFocus.test.ts`.

> **This was broken before v3.** The original scene used `offset * 5` with hard-coded 0.2-wide focus windows, so scene peaks landed at 0.1/0.3/0.5/0.7/0.9 while the HTML landed at 0.0/0.25/0.50/0.75/1.00 — a drift of up to half a section. See `docs/UPGRADE.md`, finding 13.

Three consumers read the same mapping each frame:
1. the camera rig (position + look-at target, critically damped),
2. each child scene (`focus` prop ⇒ scale, emissive intensity, per-scene animation phase),
3. the HTML labels, via `applyLabelFocus(node, focus)` writing `opacity` / `visibility` / `aria-hidden` imperatively.

**CONFIRMED.** React state — the URL hash, the nav highlight, the live-region announcement — is deliberately *not* one of them. It is derived from the scroll container's native `scroll` event via `sectionFromScrollTop`, so it stays exact when the render loop is throttled (`frameloop="demand"`) or stopped (hidden tab). Driving it from `useFrame` previously froze the announced section mid-travel.

Programmatic jumps use the inverse, `scrollTopForSection`, which measures the element's real scroll range rather than assuming `pages * clientHeight` — drei appends its fill element alongside a sticky content wrapper, so the two differ and the naive form lands short of the section. Both functions live in `lib/sections.ts` and are unit-tested.

The readable section markup intentionally does **not** use drei's `Scroll html`. That helper creates a second React root and could race React 19's R3F context. `DeckOverlay` renders in the main tree as a fixed, pointer-transparent track; `ScrollBridge` moves it with the same damped `scroll.offset` and viewport travel used by the scene. This preserves the single native scroll source without the second-root failure mode.

`applyLabelFocus` is write-guarded on `node.dataset.focus` rather than on `style.opacity`, because the CSSOM re-serialises `"0.500"` to `"0.5"` and the naive comparison never matched — the original guard was a no-op on every frame. **CONFIRMED** by `tests/unit/sceneFocus.test.ts`.

### 2.2 Render loop policy

**CONFIRMED.**

| Condition | Behaviour |
|---|---|
| Normal | `frameloop="always"`, dpr clamped by tier |
| `prefers-reduced-motion` | `frameloop="demand"`; ambient motion removed; counters jump to final value |
| Tab hidden (`visibilitychange`) | loop invalidated, zero frames drawn |
| No WebGL | canvas never mounts; a text notice plus the `/handout` link renders instead |

Every `useFrame` callback clamps `delta` with `Math.min(delta, 1 / 20)`. Without the clamp, returning to a backgrounded tab delivers one enormous delta and every damped value snaps or overshoots.

### 2.3 Device tiering

**CONFIRMED** (`lib/device.ts`, 12 unit tests):

```text
cores ≤ 4  OR  deviceMemory ≤ 4  OR  viewport < 768px   → medium
cores ≤ 2  OR  deviceMemory ≤ 2  OR  saveData  OR  2g/3g → low
otherwise                                                → high
no WebGL context                                         → none
```

| Tier | dpr clamp | antialias | ambient particles |
|---|---|---|---|
| high | `[1, min(2, dpr)]` | yes | 900 |
| medium | `[1, min(1.5, dpr)]` | yes | 420 |
| low | `[1, 1]` | no | 0 |
| none | — | — | — |
| any + reduced motion | unchanged | unchanged | 0 |

### 2.4 State

**CONFIRMED.** There is no state-management library. Preferences live in `lib/preferenceStore.ts`, a hand-written external store consumed with `useSyncExternalStore`:

- `getServerSnapshot()` returns `{ language: "en", theme: "dark", device: STATIC_PROFILE, hydrated: false }`, so SSR and the first client render agree and no hydration mismatch is possible.
- `localStorage` keys: `logisdata.language`, `logisdata.theme`.
- The provider mirrors state onto `<html>` as `lang`, `dir`, `data-theme` and `color-scheme`.
- A tiny inline script in `layout.tsx` applies the stored theme *before* paint, preventing a flash of the wrong theme.

This replaced three `useEffect`-into-`setState` patterns that the React 19 `react-hooks/set-state-in-effect` rule correctly rejects.

### 2.5 Data and derived metrics

**CONFIRMED.** `lib/data.ts` holds typed bilingual literals (`{ en, ar }` for every string). `lib/metrics.ts` derives every headline number **once at module scope**, so no component recomputes a sum during render:

| Selector | Value in the shipped dataset |
|---|---|
| `auditSummary` | 5 rows, 3 flagged (60%), 4,032 km billed vs 3,898 actual, 134 km unverified |
| `demandSummary` | peak amplification 3.45×, post-audit 1.45×, 81.6% distortion removed |
| `routeSummary` | total optimised savings $1,822,000; worst region Gulf distribution (14.2% mileage waste) |
| `warehouseSummary` | 4 zones audited, accuracy and mismatch counts derived from the zone rows |

`selectors.summariseAudit` / `summariseDemand` **throw** on an empty input rather than returning `NaN` or `0` — a silent zero in an audit deck is worse than a crash. **CONFIRMED** by `tests/unit/metrics.test.ts`.

`tests/unit/data.test.ts` enforces the dataset invariants (18 assertions): ids unique, both languages present and non-empty for every string, percentages in range, billed ≥ actual mileage, verdict enum respected.

### 2.6 Database adapter

**CONFIRMED.** `src/db/index.ts` exposes `resolvePoolSettings(env)` and `isDatabaseConfigured(env)` and creates the `pg` pool **lazily, once**, cached on a module-level symbol so Next's dev-time module reloading cannot leak pools.

- Missing `DATABASE_URL` → `resolvePoolSettings` throws `DATABASE_URL is required`; nothing connects at import time.
- `DATABASE_POOL_MAX` parsed, defaulted to 10, clamped to 1…50.
- TLS enabled only when `DATABASE_SSL === "true"`, and then with certificate verification on.
- An `error` listener is attached to the pool, and `SIGTERM`/`SIGINT` drain it.

The application itself never queries the database; it exists so the deck can be extended to live data. `/api/health` reports `"not-configured"` honestly rather than pretending.

---

## 3. Route specification

| Route | Rendering | Contract |
|---|---|---|
| `/` | static prerender | Static shell → deferred 3D control room, entered directly. Hash deep links `#overview #audit #demand #routes #warehouse`. |
| `/handout` | static prerender | Complete audit as prose: 1 `h1`, 5 `h2`, 3 data tables with `<caption>` and `th[scope=row]`, a 4-item warehouse findings list, a TOC `nav[aria-label="Presentation sections"]` with 5 links, a back link to `/`, and print styles. |
| `/api/health` | dynamic | `GET` → `200 {ok, service:"logisdata-control-room", version, database, uptimeSeconds, timestamp}` with `cache-control: no-store`. `HEAD` → `204`. |
| `/robots.txt` | static | Allows all, disallows `/api/`, advertises the sitemap. |
| `/sitemap.xml` | static | `/` (priority 1.0) and `/handout` (0.8). |
| `/manifest.webmanifest` | static | Installable PWA metadata, `display: standalone`. |

All verified against a running production server.

## 4. Interaction specification

**CONFIRMED** (`tests/e2e/navigation.spec.ts`):

| Input | Result |
|---|---|
| Nav item click | Smooth scroll to the section; `location.hash` updated |
| `→` `↓` `PageDown` `Space` | Next section |
| `←` `↑` `PageUp` | Previous section |
| `Home` / `End` | First / last section |
| `1`…`5` | Jump to that section |
| `T` | Toggle theme (persisted) |
| `L` | Toggle language (persisted, flips `dir`) |
| `?` | Open the shortcut dialog (native `<dialog>`) |
| `Esc` | Close the dialog |

Shortcuts are ignored while focus is inside an input or a `contenteditable` region.

Deep linking is bidirectional: the hash seeds the initial scroll offset on load, and scrolling rewrites the hash with `history.replaceState` (no history spam).

### Export

`lib/export.ts` emits RFC 4180 CSV (CRLF rows, quotes doubled, fields containing `"`/`,`/newline quoted) for four datasets — `freight-audit`, `demand-signal`, `route-intelligence`, `warehouse-control` — named `logisdata-<dataset>-<lang>-<YYYY-MM-DD>.csv`. Each `DatasetExport` button carries `data-dataset="<id>"` as a stable e2e hook.

## 5. Accessibility specification

**CONFIRMED** (`tests/e2e/accessibility.spec.ts` runs axe-core against WCAG 2.1 A + AA on the cover, the handout in both languages, and the control room):

- Skip link (`#presentation-content` on `/`, `#handout-main` on `/handout`) as the first focusable element; the target carries `tabIndex={-1}` so focus actually lands there.
- Each section is `<section id="section-<slug>" aria-labelledby="<slug>-title">`; Hero's heading is the page `h1`, the rest are `h2`.
- A `role="status"` live region announces the active section on change.
- The nav exposes `role="progressbar"` with a correct `aria-valuenow`.
- The canvas is `aria-hidden`; every number it visualises also exists as text or a table.
- 3D labels below 5% focus get `visibility: hidden` and `aria-hidden="true"`, so screen readers never read four invisible scenes at once.
- Reduced motion resolves counters to their final value immediately — the information is never gated behind an animation.

The canvas element is excluded from the axe scan (it is `aria-hidden` by design and axe cannot inspect WebGL); everything around it is scanned.

## 6. Security posture

**CONFIRMED** against response headers from the production server:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
  connect-src 'self' blob:; worker-src 'self' blob:; media-src 'self'; object-src 'none';
  base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

**INFERRED — CONFIDENT.** `script-src 'unsafe-inline'` cannot currently be removed: Next.js App Router emits inline bootstrap and flight-data scripts, and the pre-paint theme script is inline by necessity. A nonce requires middleware, and middleware forces every route to render dynamically, which would delete the static prerender that makes this deck fast. The trade was taken deliberately; `object-src 'none'` and `base-uri 'none'` remove the most damaging consequences. `blob:` is required by three.js worker/texture creation.

## 7. Verification architecture

```text
npm run typecheck ──▶ tsc --noEmit (strict, includes tests)
npm run lint      ──▶ eslint (next/core-web-vitals, react-hooks)
npm run test      ──▶ vitest · 11 files · 161 tests · jsdom
                      └ coverage thresholds: 85% lines, 80% stmt/fn/branch
npm run test:e2e  ──▶ playwright · 3 projects
                      ├ desktop-chromium : all specs
                      ├ reduced-motion   : accessibility + handout
                      └ mobile (Pixel 7) : handout + smoke
npm run budget    ──▶ gzip-measured cover payload vs a hard ceiling
npm audit         ──▶ fails on high/critical
```

`src/components/three/**` and `src/components/Presentation.tsx` are excluded from unit coverage: they require a real GPU and are covered by Playwright instead. The exclusion is declared with that reason in `vitest.config.mts`.

## 8. Known limitations

1. **CONFIRMED.** `script-src 'unsafe-inline'` remains, for the reason in §6.
2. **CONFIRMED.** three.js is ~1.0 MB raw / ~250 KB gzipped. It is fully deferred behind the entry gate, but visitors who enter the control room do pay it. Lighter alternatives were rejected: they would change the deliverable.
3. **CONFIRMED.** The figures are illustrative, not measured. See the data policy in the README.
4. **INFERRED — PROBABLE.** The Arabic translations are presentation-grade but have not been reviewed by a domain-expert native speaker; terminology in the freight-audit table is the most likely place for a correction.
