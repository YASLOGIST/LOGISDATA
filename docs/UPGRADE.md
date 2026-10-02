# v2 → v3 — Audit, Upgrade and Verification Report

> **Historical scope.** Sections 1–6 preserve the measured v2 → v3 record and its then-current package target (`3.0.0`). The current package is `3.1.0`; the 2026-10-02 V7 and V8 hardening results are summarized in §7–8 and recorded in full in [`UPGRADE_LOG.md`](../UPGRADE_LOG.md).

Baseline: commit `9ae5a8a` ("LOGISDATA Supply Chain Control Room", package version 2.0.0).
Historical target: the v3 branch at package version 3.0.0.

> Follow-up hardening on this branch removes the remaining drei HTML portals / React 19
> second-root failure mode. The readable deck now renders in the main React tree
> beside the Canvas, while scene annotations use synchronous Canvas text sprites and
> follow the same native scroll position.

Every number below was measured on this machine (Node 22.22.3, npm 10.9.8) by building and serving both revisions side by side — the baseline from a clean `git worktree` of `9ae5a8a`, the upgrade from the working tree.

---

## 1. Ranked audit of the baseline

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Critical** | Database pool created at module import; a missing `DATABASE_URL` crashed the import, and dev-time module reloading leaked pools | ✅ Closed |
| 2 | **High** | `dpr={1}` hard-coded on the canvas — every retina device rendered soft | ✅ Closed |
| 3 | **High** | `prefers-reduced-motion` honoured in CSS but ignored by the 3D render loop; the canvas animated continuously regardless, including while the tab was hidden | ✅ Closed |
| 4 | **High** | The intro screen was English-only; language could not be chosen before entering | ✅ Closed |
| 5 | **High** | No Content-Security-Policy and no security headers at all | ✅ Closed |
| 6 | **High** | Zero tests, zero CI | ✅ Closed |
| 7 | **High** | No WebGL capability check — unsupported browsers got a blank canvas | ✅ Closed |
| 8 | **High** | Accessibility: no skip link, no landmarks, no live region, charts with no text equivalent, invisible 3D labels still in the accessibility tree | ✅ Closed |
| 9 | Medium | No `robots.txt`, `sitemap.xml`, manifest, canonical URL or structured data | ✅ Closed |
| 10 | Medium | `tailwind.config.ts` used CommonJS `module.exports` in an ESM project | ✅ Closed |
| 11 | Medium | No deep linking — a section could not be shared or bookmarked | ✅ Closed |
| 12 | Medium | No validation that the presented figures were internally consistent | ✅ Closed |
| 13 | **High** | **Scroll ⇄ scene desynchronisation** (see below) | ✅ Closed |
| 14 | Low | Suspected font subsetting win from `@fontsource-variable/cairo/wght.css` | ❌ Non-issue — byte-identical to `index.css`; downgraded after inspection |
| 15 | Low | `Intl.NumberFormat` constructed on every render | ✅ Closed |
| 16 | Low | Hard-coded English strings inside otherwise bilingual components | ✅ Closed |

**15 of 16 closed; the 16th was disproved by measurement rather than left open.** The top-10 requirement (≥8 closed) is met with 10 of 10.

### The headline bug — finding 13

`<ScrollControls pages={5}>` makes the container five viewport heights tall, so the scrollable distance is **four** viewports: `scroll.offset` runs 0→1 across `pages − 1`. The baseline scene computed `const page = offset * 5` and then lit section *i* inside a hard-coded window `[i*0.2, (i+1)*0.2]`.

Result: the 3D scenes peaked at offsets 0.1, 0.3, 0.5, 0.7, 0.9 while the HTML sections sat at 0.0, 0.25, 0.50, 0.75, 1.00. Every scene was up to half a section out of step with the text it was supposed to illustrate, and the first and last scenes never reached full focus at all.

Fixed by making one function the single source of truth (`pagePositionFromOffset = offset × (SECTION_COUNT − 1)`), deriving focus from distance rather than from windows, and locking both with unit tests. This is the kind of defect that is invisible in review and obvious in a test.

### Other confirmed defects found and fixed

- **Scale fight.** `IndustrialScene` damped the warehouse group's X/Z scale twice per frame toward two different targets, so it oscillated. Collapsed to one `explode` multiplier applied with `setScalar`.
- **Dead write-guard.** `applyLabelFocus` compared the new opacity against `style.opacity`, but the CSSOM re-serialises `"0.500"` to `"0.5"`, so the guard never matched and the DOM was written on every frame for every label. Re-keyed on `node.dataset.focus`.
- **Per-frame allocation.** `BoxGeometry`, `EdgesGeometry` and `Color` instances were constructed during render in several scenes, and `RouteTerrain`/`WarehouseGrid` never disposed their geometries. Hoisted and disposed.
- **Unclamped delta.** No `useFrame` clamped `delta`, so returning from a background tab delivered a multi-second delta and snapped every damped value. All loops now clamp to `1/20 s`.
- **React 19 violations.** Three `useEffect` → `setState` patterns flagged by `react-hooks/set-state-in-effect`, replaced by a `useSyncExternalStore` preference store.

---

## 2. What changed

### New capabilities (requirement: ≥3, one of them visual)

0. **The cover screen was removed** (owner's request, after the measurements above). The site now opens directly in the control room. Nothing was lost: the AAST lockup, the presenter credit and the registration number are all carried by the hero section, the language and theme toggles live in the deck's control cluster, and the link to the text briefing moved there too. The component is archived at `src/components/archived/IntroScreen.tsx` rather than deleted, with its tests still running, and its 172 lines of now-dead CSS are commented out in place rather than removed, so the cover can be restored with its styling intact. Verified: no shipped JavaScript chunk contains the cover's markup, and the only `.intro-*` rules still compiled are `.intro-enter-btn` and `.intro-secondary-btn`, which the no-WebGL notice and the error boundary use. Two consequences were handled: the shell now holds its loader until the WebGL probe has run (so a device without WebGL still never downloads the 3D chunk), and `layout.tsx` gained a bilingual `<noscript>` link to `/handout`, a role the server-rendered cover used to fill.
1. **`/handout` — the deck as a readable document.** A statically prerendered, printable, screen-reader-first version of the entire audit: three data tables with captions and row headers, the warehouse findings, a table of contents and print styles. This is also what no-WebGL and reduced-motion visitors are pointed to. It makes the content crawlable and citable, which a canvas never is.
2. **CSV export of every dataset on screen.** RFC 4180 output (CRLF, correct quoting), localised, date-stamped filenames. An audit deck whose numbers cannot leave the slide is not an audit deck.
3. **Full keyboard control and deep linking.** Arrows / Page / Space / Home / End / `1`–`5` / `T` / `L` / `?`, a native `<dialog>` shortcut sheet, and bidirectional hash deep links so any section can be shared.
4. **Ambient data-stream field — the visual upgrade.** 900 / 420 / 0 GPU-animated points (tier-dependent) drifting through the scene in **one draw call**, with all motion in a vertex shader so the CPU does nothing per frame. Off entirely under reduced motion. It reads as a simulated operational signal moving through the facility rather than decoration; the current UI labels fixture telemetry explicitly as a simulation.
5. **Adaptive quality tiering.** dpr clamp, antialiasing and particle budget all derived from cores / memory / viewport / Save-Data / connection type.
6. **Theme and language persistence**, applied before first paint so neither flashes.

### Infrastructure added

- `tests/unit/` — 11 files, 153 tests, enforced coverage thresholds.
- `tests/e2e/` — 4 Playwright specs across 3 projects: smoke, navigation, accessibility (axe WCAG 2.1 AA), performance budget.
- `.github/workflows/ci.yml` — four jobs: quality, security (`npm audit` + secret/`.env` scanning), build + payload budget, e2e/a11y/perf.
- `scripts/bundle-budget.mjs` — measures the real gzipped cover payload from a running server and fails over a ceiling.
- `Dockerfile` — multi-stage, non-root, standalone output, with a container health check.
- `.nvmrc`, `.dockerignore`, a documented `.env.example`, `docs/`.

---

## 3. Measured results — baseline vs v3

### Initial payload (landing page, gzipped, measured over HTTP)

| | Baseline `9ae5a8a` | v3 | Δ |
|---|---|---|---|
| Landing page total | **234,275 B** | **198,355 B** | **−35,920 B (−15.3%)** |

Measured with `scripts/bundle-budget.mjs` against `next start` for each revision: the prerendered HTML plus every `<script src>` and stylesheet it references, each gzipped. (The Three.js chunk is lazy and not referenced by the document; the total JavaScript ceiling for the route is enforced separately in `tests/e2e/performance.spec.ts`.)

Two changes produced this. First, `framer-motion` was taken off the landing path (its two fades are CSS keyframes now), deferring the ~40 KB gzipped animation runtime into the control-room chunk where it was going to be loaded anyway. Second, the cover screen was removed entirely at the owner's request, which took its logo, icon set and credit markup out of the initial graph.

Of the remaining 198,355 B, **≈148,000 B is the Next.js 16 + React 19 framework floor** (three framework chunks). Application code, icons and CSS account for ≈51,000 B. The enforced ceiling is 205,000 B, a deliberately small regression allowance.

### Total built JavaScript

| | Baseline | v3 |
|---|---|---|
| `.next/static` JS, raw | 1,719,273 B | 1,781,002 B |
| `.next/static` JS, gzipped | 491,495 B | 512,231 B |
| CSS | 35,252 B | 45,933 B |
| Routes built | 3 | 7 |

Total output grew ~4%, which is the correct trade: it buys four new routes, the handout, export, keyboard control, the particle field and the capability fallbacks — none of which the cover visitor downloads.

### 3.1 What running the suite actually found

The Playwright suite could not be executed in the development sandbox (see §6), so its first real execution was in CI. That run is the most valuable single result in this upgrade: **it found two defects that no unit test could reach.**

| CI round | Result | What it exposed |
|---|---|---|
| 1 | 47 passed, 13 failed | Both bugs below, plus three assertions that encoded wrong expectations |
| 2 | 50 passed, 8 failed, 3 flaky | Scroll targeting fixed; contrast violations down from 584 to 146 |
| 3 | 56 passed, 5 failed, 2 flaky | Validated rounds 1–2; exposed three defects newly reachable once the cover screen was removed |
| 4 | 58 passed, 5 failed, 0 flaky | Keyboard-navigation flakiness gone; deep links still landed on the overview |
| 5 | 60 passed, 3 failed | Deep links fixed; instrumentation added to locate the remaining error |
| 6 | 51 passed, 3 failed, 1 flaky | Proved the R3F errors happen on **mount**, not on teardown |
| 7 | 53 passed, 1 failed, 1 flaky | Mobile navigation gap fixed; the remaining third-party issue was resolved in the follow-up scroll-layer pass |

**Defect A — section jumps landed short.** `goToSection` scrolled to `index * clientHeight`, which is only correct if the scrollable distance is exactly `pages * clientHeight`. drei appends its fill element alongside a sticky content wrapper, so the real range is larger: clicking "Route intelligence" (index 3) consistently stopped on Demand (index 2). Targets are now derived from the element's measured range — the exact inverse of drei's own `scrollTop / (scrollHeight - clientHeight)` — and the three scroll-geometry functions moved into `lib/sections.ts` as pure, unit-tested code (7 new tests).

This is the same *class* of bug as finding 13, in a different place, and it survived the entire analysis phase. It is the clearest argument in this report for spending effort on browser-level tests rather than more unit tests of pure functions.

**Defect B — the light theme failed WCAG 2.1 AA.** The light palette overrode text and surface tokens but kept the dark theme's bright accents. `#7dd3fc` on `#f8fafc` measures **1.59:1** against a 4.5:1 requirement. axe reported colour-contrast violations throughout the handout in light mode — and because the deck honours `prefers-color-scheme`, any visitor on a light-mode device saw it. Light now has its own accent set (`#8a5304`, `#0f766e`, `#0369a1`, `#b91c1c`) and a darker `--text-muted` (`#4c6271`), all computed against the worst-case tinted surface rather than against `--bg`.

**Also fixed, prompted by the same run:** the active section was reported from `IndustrialScene`'s `useFrame`, coupling the URL hash, the nav highlight and the screen-reader announcement to GPU frames — so under `frameloop="demand"` or a hidden tab the announced state froze mid-travel. It is now derived from the scroll container's native `scroll` event: exact, immediate and independent of rendering.

**Defect C — deep links moved the container but not the scene.** drei deliberately ignores the first scroll event it sees (it sets `scrollTop = 1` on mount to allow upward scrolling and suppresses the resulting event). A deep link applied inside that window moved the scroll container but left drei's own offset at 0, so the DOM reported `#warehouse` while the camera stayed on the overview. The same window made early key presses no-ops, which is what the "flaky" keyboard tests in rounds 1–4 actually were. Fixed by waiting for the container to become scrollable, flushing the queued target, then re-announcing the position once drei's guard clears. The readable layer now lives inside that same native scroller, so it follows the browser's exact position without a separate translated track.

**Defect D — mobile had no section navigation.** `.section-nav` was `display: none` below 860px. That is not just a visual choice: it removes the element from the accessibility tree, so phone users had no way to jump between sections and screen readers could not see the navigation at all. The top bar wraps now and the nav becomes a row of numbered pills. Related: the button text label is hidden below 1024px and `nav-index` is `aria-hidden`, so the accessible name was **empty** on tablets and phones — every nav button now carries an explicit `aria-label`.

**Three assertions were wrong, not the app**, and were corrected rather than the code: the theme tests hard-coded "light" even though the deck honours `prefers-color-scheme`; the mobile smoke test assumed a canvas, when a GPU-less runner failing the WebGL probe and showing the documented fallback is correct behaviour; and the fps floor is now CI-aware, because CI has no GPU and SwiftShader software rasterisation cannot be held to a hardware budget.

### Quality gates

| | Baseline | v3 |
|---|---|---|
| Unit/component tests | 0 | **161 passing** |
| Statement coverage | 0% | **85.17%** |
| Branch coverage | 0% | **82.55%** |
| Function coverage | 0% | **86.20%** |
| Line coverage | 0% | **89.63%** |
| E2E / a11y / perf specs | 0 | 4 specs × 3 projects (58 cases) |
| CI jobs | 0 | 4 |
| Security headers | 0 | 10 |
| `tsc --noEmit` | clean | clean |
| `eslint .` | clean | clean |
| `npm audit` | 0 vulnerabilities | 0 vulnerabilities |
| Routes with a text equivalent | 0 | all |

### Enforced runtime budget

`tests/e2e/performance.spec.ts` fails the build on any of:

- total JavaScript transferred for the landing route > 650,000 B (the whole application ships 511,696 B gzipped across *every* route, so this cannot be exceeded legitimately)
- cumulative layout shift ≥ 0.1
- sustained frame rate ≤ 30 fps in the control room
- any frame rendered while the tab is hidden

---

### 3.2 Scroll-smoothness pass (deck feel, not just frame rate)

Reported symptom: "the 5 sections lag / scroll slowly". Profiling the deck
separated that into two distinct problems -- **latency** (the deck trailed
the wheel) and **frame cost** (work done per scroll event) -- and five
changes, each with its own mechanism:

| # | Change | File | Mechanism / why it was costing |
|---|--------|------|-------------------------------|
| S1 | `ScrollControls damping` 0.25 -> 0.12 | `Presentation.tsx` | `damping` is a smooth-time in **seconds**. The 3D camera trails the native HTML briefing by ~250 ms at 0.25, which reads as "slow scrolling" at a perfect 60 fps. Halved, while keeping the easing that hides discrete wheel steps while the readable layer stays exact. |
| S2 | `performance={{ min: 0.6, max: 1, debounce: 220 }}` + `performance.regress()` on every scroll event | `Presentation.tsx`, `three/IndustrialScene.tsx` | `<AdaptiveDpr />` was already mounted but **nothing ever called `regress()`**, so it never adapted. It now renders at 60% resolution for the duration of a gesture and restores full resolution 220 ms after the last event. Fill rate dominates on retina, and scrolling is exactly when the main thread is busiest. |
| S3 | Cached `scrollHeight`/`clientHeight`, refreshed by a `ResizeObserver` | `Presentation.tsx` | The scroll handler read both every event. They are layout-dependent, so each read forced a style+layout flush interleaved with the framer-motion writes the same event triggers -- layout thrash at trackpad event rate. Neither value can change mid-scroll. |
| S4 | `memo` on `IndustrialScene` and on all five section components | `three/IndustrialScene.tsx`, `sections/*Section.tsx` | `Presentation` re-renders on every section change (nav highlight, progress bar, live region). That used to reconcile the **entire R3F element tree** and all **five** full-viewport HTML subtrees, on the exact frame the camera was mid-transition. Now the scene does not re-render at all and only the leaving + entering sections do (2 of 5). |
| S5 | Dropped dead `scroll-snap-type: y mandatory` / `scroll-snap-stop: always` / `scroll-snap-align: start`; added `contain: layout paint style` to `.presentation-section` | `Presentation.tsx`, `globals.css`, `sections/*Section.tsx` | **CONFIRMED dead**: drei renders the deck's HTML into its `position: fixed` overlay root, which is outside the scroll container's scrollable flow, so those sections were never valid snap targets -- the only in-flow child is drei's empty fill div. The declarations snapped nothing while still making the compositor resolve snap targets per scroll update. `contain` replaces them with a real guarantee: a motion change in one section cannot invalidate layout/paint/style in the other four. |

The CSS rules are **archived in place as comments**, not deleted (see
`.presentation-section` in `globals.css`), per the no-silent-deletion rule.

**New automated coverage** (`tests/e2e/performance.spec.ts`): the old
"holds an interactive frame rate while scrolling" test never scrolled -- it
sampled an idle canvas. Two real tests were added:

- *"scrolling through all five sections stays smooth"* drives the actual
  scroll container across the full range in 60 rAF-paced steps, records
  every inter-frame gap, and asserts the **median** and **p95** gap. A
  dropped frame is a long gap, so p95 is the honest jank metric.
- *"jumping to a section settles promptly"* presses `End` and asserts the
  progressbar reaches `aria-valuenow="5"` inside the latency budget. This
  is the regression guard for S1: re-raising `damping` fails it.

CI thresholds are deliberately looser than the hardware budget because CI
runners have no GPU and fall back to SwiftShader software rasterisation;
they are jank detectors, not device budgets.

Payload impact: **198,355 -> 198,343 B gz**; CSS **42,888 -> 42,831 B**.
Every change is logic or configuration, so smoothness was bought with no
byte cost.

## 4. Verification commands

```bash
cd LOGISDATA
npm ci
npm run typecheck && npm run lint && npm run test:coverage && npm run build

# payload budget, against a real server
npm run start & sleep 3 && npm run budget

# end-to-end, accessibility and performance
npm run test:e2e:install    # once
npm run test:e2e
```

---

## 5. Unknowns and residual risk

- **CONFIRMED.** The e2e suite cannot run in this sandbox (see §6), but it *was* executed in CI, twice, and the results are recorded in §3.1. A third round covering the latest fixes is pending a working GitHub connection.
- **CONFIRMED.** `script-src 'unsafe-inline'` is still required; the reasoning and the compensating controls are in `docs/ARCHITECTURE.md` §6.
- **INFERRED — PROBABLE.** Arabic copy is presentation-grade but unreviewed by a domain expert.
- **CONFIRMED.** The figures are illustrative. Nothing in this repository should be used for an operational decision without substituting audited source data.
- **RESOLVED in the follow-up hardening pass.** The deck no longer uses drei's `Scroll html`, and the 3D annotations no longer use `drei/Html`; the readable sections stay in the main React root and scene labels use synchronous Canvas text sprites. The native scroll bridge now hosts the briefing inside ScrollControls' own scroller, eliminating the translated-track synchronization failure and Troika worker teardown race. The smoke test now treats every page error as a failure instead of allow-listing the old R3F message.

## 6. Backlog — only items that were technically impossible here

1. **Execute the Playwright suite locally.** *Reason:* browser binaries cannot be installed in this sandbox. (It has, however, been executed in CI — see §3.1.) `npx playwright install --with-deps chromium` fails because the apt package `fonts-freefont-ttf` has no installation candidate in this image, and `npx playwright install chromium` fails with `ECONNRESET` / "Client network socket disconnected before secure TLS connection was established" from `cdn.playwright.dev`. No system Chrome or Chromium binary exists either. The suite and its CI job are committed and will run on the first push.
2. **Real-device performance numbers (fps, LCP, INP on actual hardware).** *Reason:* same — no browser, and a headless container has no GPU, so any figure produced here would be fabricated. The budget is instead enforced as an assertion that CI must satisfy.
3. **Lighthouse / PageSpeed scores.** *Reason:* requires Chrome; see above.
4. **Native-speaker review of the Arabic copy.** *Reason:* requires a human reviewer, not a code change.
5. **Replacing the illustrative dataset with audited figures.** *Reason:* requires access to AAST's ERP / TMS / WMS systems and credentials, which are out of scope by the task's own rules.
6. **Replacing the drei/React 19 second-root bridge.** ✅ Resolved in the follow-up pass. The same-root `DeckOverlay` portal and the in-canvas `ScrollBridge` remove the failing `Scroll html` ownership boundary while keeping the readable sections in ScrollControls' native scroll flow and preserving the synchronized 3D scene. Canvas text sprites avoid a second asynchronous font-worker teardown path.
7. **Verifying the Docker image builds and runs.** *Reason:* no Docker daemon in this sandbox. The Dockerfile follows the documented Next.js standalone pattern and the build step it depends on (`NEXT_OUTPUT=standalone`) was exercised locally, but the image itself is unbuilt.

Everything else that was identified has been implemented.

---

## 7. v3.1 V7 hardening addendum — 2026-10-02

This addendum supersedes historical test counts and current-state claims above without rewriting the v2 → v3 measurement record.

### Shipped

- Scenario-selected freight, demand, route, warehouse, and executive evidence exports; executive JSON includes export time, language, scenario, illustrative classification, bilingual disclosure, summaries, and theatre rows.
- Explicit bilingual fixture-simulation telemetry labels; the closed drawer schedules no interval and plays no audio.
- Point-of-use bilingual calculator assumptions and “illustrative, not a forecast” disclosure, with formulas and reported conclusions unchanged.
- Package-derived health version with optional deployment override; tested GET, HEAD, database-state, and no-store behavior.
- Native modal lifecycle for calculator, node inspector, and keyboard help; deterministic initial focus and invoker-focus restoration.
- Scenario/filter-derived audit summaries, localized empty results, and `aria-sort` on every sortable route header.
- Removal of the redundant `/_next/static` cache override; Next.js owns immutable hashed-asset caching.

### Current measured state

| Gate | 2026-10-02 result |
|---|---|
| Package | `3.1.0` |
| TypeScript / ESLint | 0 errors / 0 findings |
| Unit suite | 201/201 passing in 15 files |
| Coverage | 89.59% statements · 85.27% branches · 88.71% functions · 92.45% lines |
| Production build | 9 routes, pass, no baseline cache warning |
| Initial shell budget | 202,325 B gzip / 205,000 B, pass |
| Static document | 14,151 B uncompressed, pass against 40,000 B ceiling |
| Dependency audit | 0 known vulnerabilities across 558 installed packages |
| Production probes | `/`, `/handout`, health, robots, sitemap, manifest: HTTP 200; health HEAD: 204 |
| Playwright | 2/2 request-only checks pass; 57 browser checks unmeasured because Chromium is absent and CDN installation failed with `ECONNRESET` |

The complete inference ledger, same-protocol baseline/final comparison, invariant gates, truth classifications, tribunal, and residual risks live in [`UPGRADE_LOG.md`](../UPGRADE_LOG.md).

## 8. V8 interaction-boundary addendum — 2026-10-02

V8 retained the visual system and corrected keyboard/state semantics that became visible after the native-dialog upgrade:

- global section shortcuts now yield to focused controls, handled/modifier/IME events, and open modals, so Space activates a focused button instead of navigating and section keys cannot operate behind a dialog;
- scenario selection now implements roving radio focus with arrow wraparound and Home/End;
- telemetry running/paused state is truthful and announced, severity filters are bilingual and expose `aria-pressed`, and the drawer trigger exposes expanded/controlled state;
- remaining visible theme, audio, and node-inspection chrome is localized; node triggers announce their dialog behavior;
- muted success events no longer allocate follow-up audio timers.

Measured final state: **213/213 unit tests in 16 files**, coverage **89.78% statements / 85.83% branches / 89.57% functions / 92.55% lines**, 9-route production build pass, 0 audit findings, and **202,616 B gzip** against the unchanged 205,000 B shell budget. All **60/60 Playwright checks pass in browser-equipped CI** across desktop Chromium, reduced-motion, and mobile projects; local browser execution remains unavailable because the Chromium CDN resets connections in this sandbox.
