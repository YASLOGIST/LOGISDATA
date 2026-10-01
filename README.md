# LOGISDATA — Supply Chain Control Room

An interactive bilingual executive audit experience that exposes hidden cost across freight billing, demand signals, fleet routing and warehouse inventory. Built for AAST as a five-stage, data-led presentation with synchronized 3D operational models — plus a complete text briefing for every device that cannot, or should not, run WebGL.

```bash
cd LOGISDATA && npm ci && npm run dev    # http://localhost:3000
```

No configuration, no database and no API keys are required to run it.

---

## What it is

| | |
|---|---|
| **Type** | Client-rendered presentation web app (Next.js App Router + React Three Fiber) |
| **Audience** | Executive / academic audience, presented live and read asynchronously |
| **Languages** | English and Arabic, with native RTL layout and locale-correct numerals |
| **Routes** | `/` interactive control room (opens directly, no cover screen) · `/handout` accessible text briefing · `/api/health` |
| **Data** | Static, illustrative figures — see [Data policy](#data-policy) |

## Architecture

```text
Next.js App Router
├── app/
│   ├── page.tsx              cover → deferred 3D engine boundary
│   ├── handout/              static, printable, screen-reader-first briefing
│   ├── api/health            liveness + optional database readiness
│   └── robots | sitemap | manifest
├── components/
│   ├── PresentationShell     capability probe, error boundary, engine loader
│   ├── Presentation          navigation, deep links, keyboard control, canvas host
│   ├── providers/            language · theme · device-tier context
│   ├── sections/             accessible HTML analytics and audit narratives
│   ├── three/                synchronized React Three Fiber models (one canvas)
│   ├── ui/                   GlassCard · KeyboardHelp · DatasetExport
│   └── archived/             IntroScreen - the retired cover screen, kept for reference
├── lib/
│   ├── data                  typed bilingual domain data
│   ├── metrics               derived analytics selectors (computed once)
│   ├── sections              single source of truth for the five sections
│   ├── sceneFocus            scroll ⇄ scene focus mapping
│   ├── motion                motion system tokens (durations, easing, stagger)
│   ├── device                WebGL + performance-tier detection
│   ├── export                RFC 4180 CSV export
│   ├── i18n                  localization and cached Intl formatters
│   └── preferenceStore       useSyncExternalStore-backed preference state
└── db/                       lazy, pooled, singleton PostgreSQL/Drizzle adapter
```

The deck opens straight into the control room. The Three.js runtime is still a separate `next/dynamic` chunk, so the static shell paints first and a device that fails the WebGL probe never downloads it at all. All five scenes share one WebGL canvas and one camera rig; scroll position drives camera, scene scale, per-scene animation and HTML label opacity from the same mapping in `lib/sections` + `lib/sceneFocus`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for diagrams and the behavioural specification, and [`docs/UPGRADE.md`](docs/UPGRADE.md) for the v2 → v3 audit and changelog.

## Capabilities

**Presentation**
- Five synchronized 3D scenes driven by a single scroll timeline
- Deep links: `/#overview`, `/#audit`, `/#demand`, `/#routes`, `/#warehouse`
- Keyboard control: arrows, Page Up/Down, Space, Home/End, `1`–`5`, `T` theme, `L` language, `?` help
- Per-section CSV export of every dataset shown on screen
- `/handout`: the complete audit as printable, crawlable, screen-reader-first prose

**Adaptive quality**
- WebGL capability probe, run before the 3D chunk is requested, with a graceful text fallback instead of a blank canvas
- A `<noscript>` route to the text briefing, so the content survives with scripting disabled
- Device tiering (`high` / `medium` / `low`) drives pixel-ratio clamp, antialiasing and the ambient particle budget
- `prefers-reduced-motion` switches the renderer to on-demand frames and removes all ambient motion
- Rendering stops completely while the tab is backgrounded

**Accessibility**
- WCAG 2.1 AA enforced in CI with axe-core, in both languages
- Skip link, live region announcing the active section, labelled landmarks
- Decorative charts mirrored as real tables; out-of-focus 3D labels leave the accessibility tree
- Native `<dialog>` for the shortcut help (platform focus trapping)

**Operations**
- Strict CSP, HSTS, frame denial and a closed `object-src`/`base-uri`
- `GET /api/health` with honest database status; `HEAD` for cheap liveness
- Singleton connection pool with an error listener and graceful shutdown
- Multi-stage, non-root Dockerfile with a container health check

## Local development

Requirements: **Node.js 22+** (`.nvmrc`) and npm.

```bash
cd LOGISDATA
npm ci
npm run dev
```

Open `http://localhost:3000`. PostgreSQL is optional:

```bash
cp .env.example .env.local   # then edit DATABASE_URL and restart
```

## Quality gates

```bash
npm run typecheck        # tsc --noEmit, strict
npm run lint             # eslint (next/core-web-vitals + react-hooks)
npm run test             # vitest unit + component suite
npm run test:coverage    # same, with enforced coverage thresholds
npm run build            # production build
npm run audit:security   # npm audit, fails on high/critical

# end-to-end (needs browsers once: npm run test:e2e:install)
npm run test:e2e         # functional + axe WCAG 2.1 AA + performance budget

# payload budget (needs a running production server)
npm run build && npm run start &
npm run budget
```

`npm run check` runs typecheck → lint → unit tests → build in one command.

CI (`.github/workflows/ci.yml`) runs four parallel jobs: **quality**, **security**, **build + payload budget**, and **e2e + accessibility + performance**.

## Deployment

```bash
docker build -t logisdata-control-room .
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://example.org logisdata-control-room
```

Set `NEXT_PUBLIC_SITE_URL` in production — canonical URLs, OpenGraph, `robots.txt` and `sitemap.xml` all derive from it.

## Data policy

The dashboard figures are intentionally illustrative and presentation-realistic. They are **not** measurements of any real operation. Validate every metric against authoritative ERP, TMS, WMS, invoice and telematics sources before any operational or investment decision. The invariants the figures must satisfy are enforced by `tests/unit/data.test.ts`.

## Credits and licensing

- Presentation and analysis: Ahmed Yasser Ali (Reg. 211010269), AAST.
- Typeface: [Cairo Variable](https://fonts.google.com/specimen/Cairo) via `@fontsource-variable/cairo` (SIL Open Font License 1.1).
- Icons: [Lucide](https://lucide.dev) (ISC License).
- 3D: original geometry generated procedurally in code — no third-party models, textures or scanned assets are used, so there is nothing to attribute or license beyond the libraries themselves.
- `public/aast-logo.png` is institutional AAST branding, included for the academic presentation it was produced for.
