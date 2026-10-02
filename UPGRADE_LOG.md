# Autonomous Elite Upgrade Log

- Date: 2026-10-02
- Mode: UPGRADE
- Autonomy: FULL
- Target: repository root (`/home/user/LOGISDATA`), with the application in `LOGISDATA/`

## Operator fields inferred

| Field | Inference | Evidence |
|---|---|---|
| Intent | Make LOGISDATA a production-grade, bilingual executive supply-chain audit control room that communicates illustrative audit findings clearly and remains usable without WebGL. | Root `README.md`; `docs/ARCHITECTURE.md`; app metadata and handout route. |
| Audience | AAST academic/executive reviewers, logistics decision-makers, and maintainers. | Branding, byline, audit copy, presentation controls, and architecture documentation. |
| Preserve | AAST mark and attribution; English/Arabic parity; reported figures and conclusions; five-stage narrative; text handout; one-canvas synchronized 3D experience; optional database posture; CSV/JSON exports. | Existing source, tests, README, and DOCS pack hard stops. |
| Constraints | Do not alter conclusions or illustrative data; do not alter protected brand marks; do not add dependencies without evidence; do not deploy/push/apply infrastructure; preserve public routes and accessibility; stay on Arena's fixed branch `arena/01a0fe14-logisdata`. | Universal/DOCS/DESIGN/INFRA hard stops plus workspace branch policy. |
| Reference environment | Node 22, Next.js 16 App Router, React 19, evergreen Chromium/mobile, WCAG 2.2 AA target, optional PostgreSQL. | `.nvmrc`, `package.json`, Playwright config, source. |

## Assumptions

1. Blank operator fields authorize inference from the repository and direct implementation under FULL autonomy.
2. The repository is already on the required checkpoint branch. Arena fixes this session to `arena/01a0fe14-logisdata`, so the prompt's generic instruction to create `upgrade/v7-*` is superseded; work remains on the fixed branch.
3. All domain figures are illustrative and must remain unchanged. Improvements may strengthen labeling, validation, presentation, and engineering but not the author's findings.
4. No external deployment, push, database connection, migration, tracking change, or paid service is authorized.
5. The checked-in AAST logo is preserved as an existing project asset; license/brand authorization cannot be independently verified in this workspace and remains an owner responsibility.

## W0 — classification and system map

### Classification

Loaded packs:

- **WEB** — Next.js web presentation with static routes, client-side controls, WebGL, and downloadable exports.
- **3D** — one React Three Fiber canvas with five synchronized operational scenes and a performance-sensitive frame loop.
- **DESIGN** — presentation interface, visual tokens, responsive states, bilingual/RTL layouts, and protected institutional branding.
- **DOCS** — accessible/printable handout plus extensive README and architecture documentation.
- **BACKEND** — `/api/health` and lazy optional PostgreSQL access.
- **SECURITY** — network-exposed application, security headers, download boundaries, environment-driven database access.
- **INFRA** — Dockerfile and GitHub Actions CI.

DATA-AI is not loaded: the typed literals are presentation content, not a data pipeline or model. QUANT is not loaded: financial-looking metrics are static illustrative findings, not a financial model or trading system.

### System map

- **Entrypoints:** `LOGISDATA/src/app/page.tsx`, `/handout`, `/api/health`, metadata routes.
- **Client shell:** `PresentationShell` probes WebGL/device capability before dynamically loading `Presentation`.
- **Experience:** `Presentation` owns navigation and binds one Drei scroll source to semantic HTML sections and `IndustrialScene`.
- **State:** `PreferencesProvider` + `useSyncExternalStore`; persisted locale/theme; local sound preference.
- **Domain content:** typed bilingual literals in `src/lib/data.ts`; derived summaries in `src/lib/metrics.ts`; exports in `src/lib/export.ts`.
- **3D lifecycle:** one R3F canvas; tiered DPR/particle budgets; demand or suspended render loops; scene focus and scroll geometry are shared pure functions.
- **Backend:** liveness/readiness route; PostgreSQL pool is lazy and optional.
- **Quality tooling:** strict TypeScript, ESLint, Vitest coverage gates, Playwright/axe/e2e performance checks, payload budget, npm audit, CI matrix.
- **Deployment:** multi-stage non-root standalone Next.js Docker image; CI validates but does not deploy.

### Initial leverage queue

Scores use `L = (Impact × Confidence × Reach) / (Effort × Risk)` and will be revised after baseline measurements.

| Priority | Candidate | I | C | Reach | E | Risk | L | State |
|---|---|---:|---:|---:|---:|---:|---:|---|
| P0 | Run all existing checks and investigate every failure before changing behavior. | 5 | 1.0 | 3 | 2 | 1 | 7.50 | queued |
| P1 | Reconcile source/docs/version drift and any false operational claims. | 4 | 0.9 | 3 | 2 | 1 | 5.40 | queued |
| P1 | Audit application trust boundaries, metadata origins, database health semantics, exports, and external-link behavior. | 5 | 0.8 | 2 | 3 | 2 | 1.33 | queued |
| P1 | Inspect responsive, keyboard, screen-reader, print, no-WebGL, and reduced-motion states; close high-confidence gaps. | 5 | 0.8 | 3 | 4 | 2 | 1.50 | queued |
| P2 | Profile payload/frame-loop/static-shell behavior and remove provable waste without weakening budgets. | 4 | 0.8 | 3 | 4 | 2 | 1.20 | queued |
| P2 | Consolidate maintainability hotspots only where tests can lock behavior. | 3 | 0.8 | 2 | 3 | 1 | 1.60 | queued |

## W1 — deterministic baseline protocol

Environment: Linux sandbox; Node and browser versions recorded by the commands below. This exact protocol will be rerun in W7.

```bash
cd LOGISDATA
node --version
npm --version
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --audit-level=high
# then, when the production server is running:
npm run budget -- --url http://127.0.0.1:3100
npm run test:e2e
```

Initial environment observations:

- Node: **v22.22.3 MEASURED** (`node --version`).
- npm: **10.9.8 MEASURED** (`npm --version`).
- Install: **557 packages added, 558 audited, 0 vulnerabilities MEASURED** (`npm ci`, 2026-10-02).
- npm reported deprecation warnings in transitive tooling (`@esbuild-kit/*`) and for pinned ESLint 9.39.4; no change is made until dependency provenance and compatibility are verified.

### Baseline results

| Instrument | Baseline result | Status |
|---|---|---|
| TypeScript | **0 errors MEASURED** (`tsc --noEmit`, 7.7 s) | pass |
| ESLint | **0 findings MEASURED** (`eslint .`, 7.6 s) | pass |
| Unit tests | **185/185 assertions passed in 14 files MEASURED** (Vitest 5.0.3, 20.87 s) | assertions pass |
| Coverage gate | Statements **79.94%** (594/743); branches **77.26%** (435/563); functions **75.60%** (189/250); lines **83.62%** (531/635), all MEASURED | **fail**: configured floors are 80/80/80/85 |
| Unit runtime diagnostics | Repeated jsdom canvas diagnostics, invalid mocked `priority`/`prefetch` DOM attributes, and one simulated navigation warning, MEASURED from stderr | **fail**: suite exits red and is noisy |
| Production build | **9 routes compiled/prerendered MEASURED** in 21.9 s | pass with one warning: redundant custom `Cache-Control` for `/_next/static` |
| Dependency audit | **0 vulnerabilities MEASURED** across 558 installed packages (`npm audit --audit-level=high`) | pass |
| Secret baseline | **0 matching key patterns; only `.env.example` tracked MEASURED** with the CI patterns | pass |
| Initial shell payload | **201,725 B gzip MEASURED** by `scripts/bundle-budget.mjs` against `next start`, budget 205,000 B | pass, only 3,275 B headroom |
| Static document | **14,151 B uncompressed MEASURED** by production response `Content-Length` | pass (<40,000 B test ceiling) |
| Health route | HTTP 200, database `not-configured`, security headers present, MEASURED with `curl` | pass except reported app version is stale (`3.0.0` vs package `3.1.0`) |
| E2E/a11y/performance | **UNMEASURED**: 2 request-only checks passed; 57 browser checks could not launch because Chromium is absent. A direct install retried five times and failed with `ECONNRESET` from `cdn.playwright.dev`. | environment-blocked, not treated as product failures |
| Real-device CWV / frame time / GPU memory | **UNMEASURED**: no browser/GPU/real device in workspace | environment-blocked |
| Docker image build | **UNMEASURED**: no Docker daemon check performed | environment-blocked |

### Baseline P0 findings

1. **The repository's enforced coverage job is red.** This is a real CI break, not an estimated risk. Assertions pass but Vitest exits non-zero because recently added production surfaces are included without enough behavioral coverage.
2. **Scenario exports can disagree with the screen.** Audit/demand/route sections render scenario-derived rows while CSV and executive JSON export static active-audit data. This violates the export's stated “numbers shown on screen” contract.
3. **Synthetic telemetry is presented as live.** Source comments identify replayed/randomized fixtures, while visible labels say “Live,” “STREAM ACTIVE,” and current-time timestamps. This violates truth labeling.
4. **Health provenance is stale.** The package is `3.1.0`; `/api/health` and `.env.example` default to `3.0.0`.
5. **Calculator inputs are illustrative, but the modal does not disclose its fixed formula assumptions at the point of use.** No formula or reported conclusion will be changed without explicit approval; the safe upgrade is transparent labeling only.

### Revised leverage queue

| Priority | Candidate | L | Decision |
|---|---|---:|---|
| P0 | Restore the existing coverage gate with behavioral tests; remove test-only diagnostics without suppressing real errors. | 7.50 | implement |
| P0 | Make CSV/JSON exports scenario-consistent and regression-test every scenario. | 4.50 | implement |
| P0 | Relabel replayed events as a telemetry simulation in both languages. | 6.00 | implement |
| P0 | Derive the health version from package metadata and test the route contract. | 5.00 | implement |
| P1 | Upgrade calculator/node dialogs to native modal semantics and add keyboard/focus regression coverage. | 2.00 | implement |
| P1 | Add explicit table/filter empty state and accessible sort state. | 2.40 | implement |
| P1 | Remove redundant static-asset cache override that adds a Next.js build warning. | 3.60 | implement |
| P1 | Reconcile README/architecture/version/coverage claims with current measured behavior. | 5.40 | implement after final measurements |
| P2 | Reduce initial payload. | 0.80 after baseline: high risk with only 3.2 kB budget headroom, but no isolated high-confidence removal yet | defer unless implementation creates a measured opportunity |

## W4/W5 — form directions and Craft Contract

### Divergence

- **Evolved:** retain the industrial control-room identity; make truth state, simulation state, exports, and modal behavior exact and quiet.
- **Distinctive:** foreground an “evidence rail” on every theatre, exposing provenance and assumptions beside each metric.
- **Category-defining:** make scenario comparison the primary interaction, with baseline/current/mitigated deltas and exportable audit trails throughout.

**Choice:** Evolved, with one evidence-oriented signature element: explicit simulation/illustrative provenance at the exact controls that generate synthetic output. It best preserves the five-theatre structure and author's conclusions, has the lowest cognitive and regression cost, and fixes the highest-confidence truth failures. The other directions would change the narrative hierarchy and financial interpretation too broadly under the preserve constraints.

### Craft Contract

- **Thesis:** every dramatic signal must remain operationally legible and visibly honest about whether it is measured, illustrative, or simulated.
- **Audience/job:** an AAST reviewer or logistics decision-maker scans the audit, compares scenarios, exports evidence, and can always reach the same content without 3D.
- **References:** industrial control-room alarm discipline; aviation-style state labeling; financial-model assumption transparency; WCAG native interaction semantics.
- **Structure:** preserve the five-stage sequence; make current scenario and provenance unambiguous before adding detail.
- **Voice:** concise executive English and Arabic, one term per concept, no inflated claims; LTR/RTL parity.
- **Visual system:** preserve the existing semantic palette, Cairo type family, spacing rhythm, restrained transform/opacity motion, and reduced-motion behavior.
- **Signature element:** scenario-consistent evidence export—what the operator sees is exactly what leaves the application.
- **Forbidden:** fake-live language; unlabeled estimates; export/screen divergence; decorative UI additions; new gradients/glass; hidden state; data or conclusion changes.

Baseline quality results, ledger, wave decisions, invariant gates, tribunal, and residual risks continue below.

## W2 — truth, correctness, and interaction stabilization

### Changes shipped

- Made freight, demand, route, warehouse, and executive-report exports derive from the selected scenario. Added scenario, language, export-time, illustrative classification, and bilingual disclosure metadata; non-default scenario filenames are explicit.
- Replaced stale health-version literals with the package version while preserving a trimmed deployment override; added GET/HEAD, package fallback, database-state, and cache-contract tests.
- Reframed fixture-driven telemetry as an **audit telemetry simulation** in English and Arabic, disclosed that it is not connected to operational systems, and stopped its interval/audio work while closed.
- Added point-of-use bilingual calculator assumptions and “illustrative estimate, not a forecast” disclosure to the interactive calculator and handout. Formulas, input bounds, data, and conclusions are unchanged.
- Derived the audit summary from the rows currently displayed, added a localized empty-filter state, and exposed route-table sort direction with `aria-sort` on all sortable headers.
- Converted the calculator, node inspector, and keyboard help to native modal dialogs with platform focus containment/Escape behavior, deterministic initial focus, and invoker-focus restoration.
- Removed the redundant hashed-static cache override that caused the baseline build warning. Next.js remains responsible for immutable hashed-asset caching; API routes remain `no-store`.
- Replaced noisy/inaccurate jsdom canvas and Next component mocks with deterministic capability and browser-semantic stubs.
- Expanded behavioral coverage for scenarios, provenance, health, modal lifecycle/focus, telemetry lifecycle, calculator controls, node states, filters, sorting, database lifecycle, derived metrics, and simulation branches. No threshold was lowered and no production branch was special-cased for tests.

### Invariant Gate

| Invariant | Evidence | Result |
|---|---|---|
| Project identity and five-stage narrative preserved | No brand, stage, route, headline, or conclusion literals removed; handout and 3D shell remain. | pass |
| Reported data/formulas preserved | Scenario transforms and calculator formulas are unchanged; tests lock all scenarios and calculator input behavior. | pass |
| English/Arabic parity preserved | New simulation, provenance, assumption, and empty-state copy is bilingual; localized behavior tests pass. | pass |
| Existing routes/capabilities preserved | Production build emits the same 9 routes; route probes return 200; CSV/JSON controls remain. | pass |
| Accessibility/reduced-motion posture not weakened | Native dialogs, focus restoration, `aria-sort`, and explicit non-color status labels added; existing reduced-motion source remains. | pass within available instruments |
| Security/privacy posture not weakened | Security headers remain present; API cache remains `no-store`; audit reports 0 known vulnerabilities. | pass |

### W2 measured verification

- TypeScript: **0 errors MEASURED**.
- ESLint: **0 findings MEASURED**.
- Unit/behavior suite: **201/201 tests passed in 15 files MEASURED**.
- Coverage gate: statements **89.59% (689/769)**; branches **85.27% (498/584)**; functions **88.71% (228/257)**; lines **92.45% (613/663)** — **MEASURED PASS** against unchanged 80/80/80/85 floors.
- Production build: **9 routes built MEASURED**, with the baseline cache warning removed.
- Dependency audit: **0 vulnerabilities MEASURED** across 558 installed packages.
- Production route probes: `/`, `/handout`, `/api/health`, `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest` returned **HTTP 200 MEASURED**; health HEAD returned **204 with no body MEASURED**.
- Health provenance: production response reports package version **3.1.0 MEASURED** and optional database state `not-configured`.
- Security probe: CSP, HSTS, frame denial, MIME sniffing denial, referrer, permissions, COOP, and CORP headers remain present **MEASURED**; API cache is `no-store`.
- Initial shell payload: **202,325 B gzip MEASURED** against the unchanged 205,000 B budget — pass with 2,675 B headroom; this is +600 B versus baseline.
- Static document: **14,151 B uncompressed MEASURED**, unchanged and below the 40,000 B test ceiling.
- Playwright request-only static-shell checks: **2/2 passed MEASURED**. Browser-rendered Playwright/axe/frame checks remain environment-blocked by the absent Chromium binary; no product result is inferred.

### W2 wave decision

The 600 B payload increase is accepted: it buys shared native-dialog lifecycle/focus behavior and remains within the pre-existing hard budget. Further bundle surgery is deferred because only 2,675 B of headroom remains and no isolated, low-risk removal was proven. The final wave is documentation reconciliation and same-protocol closeout; no new feature scope is opened.

## W3 — documentation reconciliation and closeout

### Reconciliation

- Corrected README source/test counts, coverage floors/results, shell payload, runtime-boundary language, scroll/focus math, adaptive DPR behavior, security-header count, health payload, and `npm run check` description.
- Removed obsolete references to an explicit cover-screen CTA/entry gate and documented the actual capability-gated automatic engine load.
- Added scenario-evidence, simulation-truth, calculator-provenance, and native-dialog contracts to the feature/module maps.
- Updated the architecture specification from the stale 11-file/161-test state to 15 files/201 tests, corrected the `getSectionFocus` signature and warehouse-bin summary, and distinguished source/unit confirmation from browser checks that were not re-measured.
- Preserved `docs/UPGRADE.md` as a historical v2 → v3 measurement record, explicitly labeled its `3.0.0` scope, and added a current `3.1.0` V7 addendum instead of silently rewriting old results.
- Removed one stale source comment claiming an unimplemented Executive Markdown export.

### Final same-protocol comparison

Environment stayed constant: Node **v22.22.3 MEASURED**, npm **10.9.8 MEASURED**. Final `npm ci` again installed 557 packages and audited 558 with 0 vulnerabilities. Deprecation notices for transitive `@esbuild-kit/*` and pinned ESLint 9.39.4 remain; no dependency was changed without compatibility evidence.

| Instrument | Baseline | Final | Delta / verdict |
|---|---|---|---|
| TypeScript | 0 errors | 0 errors | preserved, pass |
| ESLint | 0 findings | 0 findings | preserved, pass |
| Unit/behavior suite | 185/185 in 14 files | 201/201 in 15 files | +16 tests; pass |
| Statements | 79.94% (594/743), fail | 89.59% (689/769), pass | **+9.65 pp** |
| Branches | 77.26% (435/563), fail | 85.27% (498/584), pass | **+8.01 pp** |
| Functions | 75.60% (189/250), fail | 88.71% (228/257), pass | **+13.11 pp** |
| Lines | 83.62% (531/635), fail | 92.45% (613/663), pass | **+8.83 pp** |
| Production build | 9 routes, pass with redundant-cache warning | 9 routes, pass without that warning | improved |
| Dependency audit | 0 vulnerabilities | 0 vulnerabilities | preserved |
| Initial shell | 201,725 B gzip | 202,325 B gzip | +600 B (+0.30%); still below 205,000 B |
| Static HTML | 14,151 B | 14,151 B | unchanged |
| Health provenance | stale literal `3.0.0` | package-derived `3.1.0` | corrected |
| Production route/security probes | pass | pass | preserved; API no-store and HEAD 204/body 0 verified |
| Playwright | 2 request-only pass; 57 browser checks blocked | 2 request-only pass; 57 browser checks blocked | environment unchanged; no browser result claimed |

### Seven-dimension scorecard

Scores are **ESTIMATED expert judgments**, not instrument output. The rubric is 0–10, where 5 is functional but materially exposed, 8 is production-ready with bounded gaps, and 10 requires complete real-environment evidence.

| Dimension | Baseline | Final | Basis |
|---|---:|---:|---|
| Correctness | 6.5 | 9.0 | Screen/export divergence and stale health provenance fixed; behavioral coverage is green. |
| Purpose | 7.5 | 8.8 | Evidence leaving the control room now matches the selected audit scenario. |
| Robustness | 6.0 | 8.6 | Health/database boundaries, hidden telemetry lifecycle, empty states, and native modal lifecycle are locked by tests. |
| Efficiency | 8.0 | 8.2 | Closed telemetry does no timer/audio work; payload remains within budget despite a measured +600 B. |
| Experience | 7.6 | 8.7 | Focus restoration, sort state, empty results, and bilingual point-of-use disclosures improve operation without changing identity. |
| Maintainability | 6.8 | 8.7 | Shared modal hook, package-derived version, pure selectors, behavior tests, and reconciled docs reduce drift. |
| Truth | 5.5 | 9.1 | Fake-live language, unlabeled estimates, stale version claims, and scenario-mismatched evidence are corrected. |
| **Unweighted mean** | **6.8** | **8.7** | ESTIMATED; browser/GPU and human-language evidence cap the final score. |

### Truth classification ledger

**MEASURED**

- Node/npm versions; install/audit counts; type/lint/test/coverage/build results.
- Gzipped shell payload, static response size, route status codes, health body/version, HEAD body size, API cache policy, and security-header presence.
- Source/test module and line counts used in reconciled documentation.
- Two request-only Playwright checks passed; all 57 browser-dependent checks failed before product execution because the configured Chromium executable is absent.

**ESTIMATED**

- Seven-dimension expert scores and qualitative leverage/tribunal judgments.
- The expected maintenance and operator-comprehension benefit of the selected Evolved direction.

**UNMEASURED**

- Browser-rendered WCAG/axe result for this exact revision; CLS, frame rate, scroll p95, real-device Core Web Vitals, and GPU memory.
- Docker image build/runtime in a daemon.
- Native-speaker freight-domain review of Arabic copy.
- Authorization/licensing status of the preserved institutional mark.
- Behavior against a real configured PostgreSQL service; unit tests cover lifecycle and error semantics, not an external database.

### Final tribunal

**Proponent.** The upgrade closes every repository-provable P0: the enforced coverage gate is green without relaxed thresholds; exported evidence follows scenario state; simulation and calculator provenance are visible in both languages; package/health versions agree; hidden telemetry stops work; native dialogs and table states are more accessible; the production build, audit, payload budget, routes, and security probes pass.

**Skeptic.** The result is not fully browser-certified in this sandbox. Fifty-seven browser checks—including axe, responsive navigation, modal Escape in a real browser, downloads, CLS, and frame budgets—did not execute because Chromium is absent. Payload headroom is only 2,675 B. CSP retains the documented inline-script exception. The dataset remains illustrative, Arabic remains without domain-native review, and no real database or Docker daemon was exercised.

**Judge.** **Ship the repository upgrade; do not represent it as browser-, device-, database-, or deployment-certified.** The code-level and production-server evidence is materially stronger, all changed behavior is reversible and covered, preserved conclusions are untouched, and the residual gaps are environment/human/provenance constraints rather than hidden product failures. A browser-equipped CI run is the first post-merge requirement.

### Residual risk and deferral register

| Risk / opportunity | Classification | Decision |
|---|---|---|
| Run all 59 Playwright/axe/performance checks in browser-equipped CI | UNMEASURED | required next; environment-blocked here after five Chromium CDN failures |
| Real-device CWV, scroll frame gaps, and GPU memory | UNMEASURED | defer to representative hardware; do not substitute SwiftShader figures |
| 2,675 B payload-budget headroom | MEASURED | monitor; no speculative bundle surgery without an isolated win |
| CSP `unsafe-inline` | CONFIRMED residual | retain documented static-prerender trade-off; revisit only with a measured nonce architecture |
| ESLint and `@esbuild-kit` deprecation notices | MEASURED residual | schedule compatibility-led dependency maintenance; no blind major upgrade |
| Docker image and real PostgreSQL readiness | UNMEASURED | verify in authorized infrastructure |
| Arabic domain terminology | UNMEASURED | obtain native freight-domain review |
| Illustrative dataset / institutional mark | CONFIRMED / UNMEASURED authorization | preserve disclosure; owner must validate data and asset rights before external use |

### Closeout

- W0/W1 checkpoint commit: `89e6e61` (`docs: record v7 recon and measured baseline`).
- W2 implementation commit: `9e2f6cd` (`feat: align evidence exports and simulation truth`).
- Working branch: `arena/01a0fe14-logisdata`; no push, deployment, migration, secret access, paid service, or external publication was performed.
- Documentation reconciliation and this closeout are recorded as the final atomic wave after a clean diff/status review.

---

## V8 continuation — 2026-10-02

### W0/W1 route, assumptions, and checkpoint

- **TARGET inferred:** repository root `/home/user/LOGISDATA`, application unit `LOGISDATA/`; the current clean commit `a563ea4` is the recoverable V8 checkpoint. Arena fixes work to `arena/01a0fe14-logisdata`, so no second branch is created.
- **Intent/audience/preserve/constraints:** inherited from the still-current operator inference at the top of this log. No repository evidence justifies changing the five-theatre purpose, illustrative conclusions, bilingual identity, or authorization boundary.
- **Primary domain:** WEB (delivery, interaction, accessibility). **Secondary:** 3D/SPATIAL, DESIGN, DOCS, BACKEND. **Specialist:** Spatial Engine for render-loop invariants only. **Cross-cutting:** TRUTH, ACCESSIBILITY, SECURITY, PERFORMANCE, MAINTAINABILITY. INFRA remains verification-only; DATA-AI, QUANT, GAME, MOBILE-native, and AUDIO-MEDIA are not activated as independent units.
- **Baseline:** the same-protocol V7 final at checkpoint `a563ea4` is reused because source behavior is unchanged: 201/201 unit tests, coverage 89.59/85.27/88.71/92.45, 9-route build pass, 202,325 B gzip shell, 0 audit findings; 57 browser checks remain environment-blocked. These remain MEASURED checkpoint values, not re-estimates.
- **V8 leverage queue:** (P0) stop global section shortcuts from stealing Space/arrows from focused controls or operating behind a modal; (P1) complete WAI radio keyboard behavior for scenario selection; (P1) make telemetry paused/filter state truthful, localized, and programmatically exposed; (P1) close remaining visible bilingual chrome gaps; (P2) avoid muted success-tone timeout allocation. Major visual redesign and speculative bundle surgery are rejected: the Evolved Craft Contract remains the strongest fit and payload headroom is narrow.

### W2–W6 implementation and Invariant Gate

- Added a shared keyboard-boundary predicate: handled/modifier/IME events, interactive descendants, and open native dialogs now own their keys before global presentation shortcuts. This fixes the material Space-key conflict on focused buttons and blocks background section movement behind modals.
- Rebuilt the scenario switcher as a data-driven WAI radio group with one tab stop, arrow wraparound, and Home/End selection; selection still preserves scenario formulas and sound behavior.
- Made telemetry state exact: running changes to paused visibly and through a live status; bilingual severity filters expose `aria-pressed`; the trigger exposes `aria-expanded`/`aria-controls`.
- Localized remaining visible theme/audio/node-selector chrome in Arabic, changed the node collection from an unsupported toolbar pattern to a labeled group, and exposed node/calculator/help dialog intent.
- Muted success events now return before allocating two follow-up timers.
- Added pure keyboard-boundary tests, expanded scenario/telemetry/audio behavior tests, and added a browser regression for focused-control and modal shortcut isolation.

Invariant Gate: project identity, routes, figures, formulas, scenario transforms, exports, English/Arabic structure, 3D ownership, security policy, and dependency set are unchanged. No cross-boundary file outside the repository target was touched. Build/tests remain green; payload remains bounded.

### W7 final evidence

| Instrument | V8 result | Status |
|---|---|---|
| TypeScript / ESLint | 0 errors / 0 findings | PASSED |
| Unit/behavior suite | 213/213 in 16 files | PASSED |
| Coverage | 89.78% statements (712/793); 85.83% branches (521/607); 89.57% functions (232/259); 92.55% lines (634/685) | PASSED unchanged floors |
| Production build | 9 routes | PASSED |
| Dependency audit | 0 vulnerabilities | PASSED |
| Initial shell | 202,613 B gzip / 205,000 B | PASSED; +288 B from V7, 2,387 B headroom |
| Static document | 14,151 B | PASSED; unchanged |
| Routes / health / security | six production routes probed at 200; health HEAD 204/body 0; CSP/HSTS/frame/MIME/no-store present | PASSED |
| Playwright | 60 configured: 2 request-only pass, 58 browser-dependent launch failures | BLOCKED by absent Chromium before product execution |

### Material quality delta

- **Robustness:** global shortcuts could override native control activation and operate behind modals → ownership is explicit and unit-tested.
- **Experience/accessibility:** click-only custom scenario radios and unlabeled filter selection → WAI keyboard model, roving focus, pressed states, and expanded/controlled relationships.
- **Truth:** a paused replay still said “SIMULATION RUNNING” → state now says and announces “SIMULATION PAUSED” in both languages.
- **Efficiency:** muted optimized events allocated two timers → zero success-sequence timers while muted, locked by test.
- **Maintainability:** three duplicated scenario controls and scattered keyboard exclusions → one option registry and one tested boundary predicate.

### V8 tribunal, rejection, and residuals

- **Target user/domain master:** keyboard operation now follows control intent; audit scenarios and telemetry state are more legible without changing the narrative or data.
- **Principal architect/efficiency:** the two small shared structures justify their measured +202 B shell cost; no dependency or new asset was added.
- **Risk/hostile review:** the newly configured browser regression could not execute here, nor could axe, responsive, download, or real frame tests. The 2,387 B shell headroom is narrow. Existing CSP, Arabic-review, Docker, database, asset-rights, and illustrative-data residuals remain as recorded above.
- **Owner judgment:** ship this bounded continuation. Rejected: visual redesign, native-input restyling, dependency churn, and speculative bundle surgery; each carried more regression risk than demonstrated value.
- **Next moves:** run all 60 Playwright checks in browser-equipped CI; measure representative-device CWV/frame behavior; obtain authorized Arabic/domain and asset review. No other high-confidence local work exceeds preservation value.
