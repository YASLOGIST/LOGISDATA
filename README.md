# LOGISDATA — Supply Chain Control Room

An interactive bilingual executive audit experience for exposing hidden cost across freight billing, demand signals, fleet routing, and warehouse inventory. Built for AAST as a five-stage, data-led presentation with synchronized 3D operational models.

## Architecture

```text
Next.js App Router
├── PresentationShell       lightweight cover + deferred engine boundary
├── Presentation            navigation, preferences, keyboard controls
├── sections/               accessible HTML analytics and audit narratives
├── three/                  synchronized React Three Fiber visual models
├── lib/                    typed domain data, localization, scene focus
├── db/                     lazy, bounded PostgreSQL/Drizzle adapter
└── api/health              liveness + optional database readiness
```

The heavy Three.js runtime is dynamically loaded only after the user enters the control room. All five operational scenes share one WebGL canvas and camera rig. Visual labels use the same focus curve as the scene transitions, while tabular content remains semantic HTML.

## Capabilities

- English/Arabic localization with native RTL layout and localized numbers
- Dark/light preferences persisted locally across visits
- Keyboard navigation: arrows, Page Up/Down, Home, and End
- Motion-reduction support and background-tab render suspension
- Responsive audit tables, demand charts, route intelligence, and warehouse controls
- Recoverable visualization error boundary and honest database-optional health checks
- Production security headers, bounded connection pooling, strict TypeScript, and zero known npm audit findings

## Local development

Requirements: Node.js 22+ and npm.

```bash
cd LOGISDATA
npm ci
npm run dev
```

Open `http://localhost:3000`. PostgreSQL is optional for the presentation. To enable database readiness checks:

```bash
cp .env.example .env.local
# Edit DATABASE_URL, then restart the server.
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

`GET /api/health` returns `200` when the app is live (including when the optional database is not configured) and `503` when a configured database is unreachable. `HEAD /api/health` is a low-cost liveness probe.

## Data policy

The dashboard figures are intentionally illustrative and presentation-realistic. Validate metrics against authoritative ERP, TMS, WMS, invoice, and telematics sources before operational or investment decisions.
