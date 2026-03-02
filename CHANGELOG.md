# Changelog

All notable changes to SchoolZone Digital Twin (MRDT) are documented here. For full system documentation, see [docs/SPECIFICATION.md](./docs/SPECIFICATION.md).

---

## [Unreleased]

---

## 2026-03-01 (continued +2)

### Added
- **Live corridor congestion via Google Routes API** — `/api/traffic/live` proxies `routes.googleapis.com/directions/v2:computeRoutes` with `TRAFFIC_AWARE` routing for each corridor; congestion index = `delaySec / staticSec`, clamped 0–1; 60-second server-side cache per city; in Demo mode returns zero overrides and the synthetic model takes over
- **Live incident overlay via TomTom Traffic Incidents API v5** — `/api/incidents/live` fetches real-time incidents within the Springfield IL bounding box; maps `iconCategory` → incident type and label, `magnitudeOfDelay` → `RiskLevel`; assigns each incident to the nearest corridor school; 5-minute server-side cache; only active in Springfield IL Live mode
- **City-aware Portfolio Risk Heatmap** — heatmap cards now reflect the active city; switching to Khalifa City or MBZ City replaces Springfield school cards with Abu Dhabi school cards; risk values generated from the congestion engine (`getCongestionForCorridor`) at NOW, +15 min, +30 min horizons
- **`lib/cityConfig.ts`** — shared module exporting `CityId`, `CityBounds`, `CityConfig`, `CITIES`, `SPRINGFIELD_CORRIDORS`, `KHALIFA_CORRIDORS`, `MBZ_CORRIDORS`; eliminates duplication between `CorridorMap.tsx` and `app/executive/page.tsx`
- **`lib/pushSubscriptionCache.ts`** — centralises the in-memory push subscription Set; fixes a Next.js build error caused by exporting a non-HTTP-verb constant from a route file

### Fixed
- **High-Risk Window KPI** showed raw ISO timestamp (e.g. `~2026-03-02T00:31:20.87Z`); now formats as `HH:MM` via `toLocaleTimeString()`

### Environment Variables
- `GOOGLE_MAPS_SERVER_KEY` — optional server-only key for the Google Routes API; falls back to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `TOMTOM_API_KEY` — required for live TomTom incident data in Springfield IL

---

## 2026-03-01 (continued +1)

### Added
- **Live/Demo data source toggle** in Topbar — segmented `AWS Live / Demo` control that appears only when `NEXT_PUBLIC_AWS_SNAPSHOT_API_URL` is configured; switches the app between the real-time AWS pipeline and static mock scenario files at runtime
  - **AWS Live mode** — fetches from the Snapshot API Lambda every polling interval; scenario selector hidden (not applicable to live data)
  - **Demo mode** — loads static mock JSON from `/mock/scenarios/<scenario>/`; scenario selector visible as before
  - Selection persists to `localStorage` via `DemoConfig`; defaults to `"live"` when the AWS URL env var is present, `"demo"` otherwise
- **`DataMode` type** (`"live" | "demo"`) exported from `lib/demoConfig.tsx` and added to the `DemoConfig` interface
- **`dataMode` param** added to `loadLiveState()` in `lib/data.ts` — AWS fetch is skipped when `dataMode === "demo"` even if the env var is set, enabling clean in-app switching without restarting the dev server

---

## 2026-03-01 (continued)

### Added
- **AWS real-time data pipeline** (`infra/`) — CDK stack that generates live school zone traffic time series data and serves it to the Next.js app
  - **Generator Lambda** (`schoolzone-generator`) — runs the Gaussian dismissal-peak traffic model server-side for all 11 zones across 3 cities; triggered every 60 seconds by EventBridge
  - **Kinesis Data Stream** (`schoolzone-traffic`) — real-time transport for zone telemetry events
  - **Kinesis Firehose → S3** (`schoolzone-to-datalake`) — buffers stream records and delivers to the data lake every 60s/5MB, partitioned by `year/month/day/hour`, GZIP compressed; queryable via Athena
  - **S3 Data Lake** (`schoolzone-datalake-*`) — long-term cold storage with lifecycle rules (IA at 30d, Glacier at 90d)
  - **DynamoDB Zone State Table** (`schoolzone-zone-state`) — hot store for latest telemetry per zone; TTL of 10 minutes auto-purges stale records
  - **Processor Lambda** (`schoolzone-processor`) — reads Kinesis batches and writes latest zone state to DynamoDB via `PutItem`
  - **Snapshot API Lambda** (`schoolzone-snapshot-api`) — queries DynamoDB and returns a `LiveState` JSON in the exact shape the Next.js app expects; falls back to model-generated data if DynamoDB has no records yet
  - **Lambda Function URL** — CORS-enabled public HTTPS endpoint for the snapshot API; no API Gateway required
- **`lib/data.ts` AWS integration** — `loadLiveState()` now checks for `NEXT_PUBLIC_AWS_SNAPSHOT_API_URL`; if set, fetches live data from the pipeline with automatic fallback to mock data on failure
- **`infra/README.md`** — setup guide covering prerequisites, deploy steps, Athena query examples, and weather condition configuration

### Infrastructure
- AWS CDK v2 (TypeScript) bootstrapped and deployed to `us-east-1` (account `304240833047`)
- Stack deployed successfully with all 11 zones writing to DynamoDB every minute
- Snapshot API live at Lambda Function URL; wired into app via `.env.local`

### Fixed
- Replaced Amazon Timestream with DynamoDB after Timestream returned `AccessDeniedException` (requires special account enablement for new accounts)

---

## 2026-03-01

### Added
- **Product specification document** (`docs/SPECIFICATION.md`) — comprehensive spec covering architecture, all 15 features, data models, API endpoints, integrations, state management, non-functional requirements, and deployment setup
- **Multi-city support** for Corridor Traffic Map — city picker dropdown with three regions: Springfield IL, Khalifa City AUH, MBZ City AUH; each city has its own corridors, schools, map center, zoom levels, and bounds restriction
- **Abu Dhabi demo scenarios** — Khalifa City (Yasmina British Academy, ADNOC Schools Khalifa, Khalifa International Academy) and MBZ City (Aldar Academies MBZ, Al Bateen Academy, Emirates National School)
- **City selector dropdown** in Corridor Traffic Map header; switching city resets selected school and pans/zooms the map to the new region
- **"Demo" label** added to the scenario selector in the Topbar to visually distinguish it from the What-If scenario panel
- **Fog weather condition** added to replace snow (snow is not relevant for UAE demo contexts)

### Changed
- **Fog Alert** quickstart preset replaces Snow Day; set to 2:50 PM with traffic diversion scenario
- School name for MBZ City zone updated to **Aldar Academies MBZ** (previously MBZ City Academy)

### Fixed
- Hardcoded `CORRIDORS` constant references replaced with dynamic `corridors` derived from selected city config
- Hardcoded `OVERVIEW_CENTER`, `OVERVIEW_ZOOM`, `DEFAULT_ZOOM`, and `BOUNDS_RESTRICTION` constants removed and moved into per-city config
- School picker correctly resets when switching cities

### Performance
- Memoized map options (`getMapOptions`) and all child component props (Circle, Polyline, Marker options) to prevent unnecessary Google Maps re-renders
- Wrapped `IncidentOverlay`, `GeofenceLayer`, and `CorridorLabels` in `React.memo`
- Active mitigations sorted by most recent first

---

## 2026-02-28

### Added
- **Supabase Realtime** replaces SSE for intervention sync — interventions written to Supabase `interventions` table and broadcast to all connected clients via `postgres_changes` subscription
- **Supabase persistence** for interventions — migrated from in-memory store; all applied interventions survive page refresh and are shared across sessions
- **Intervention Feed** component — timeline-style audit trail showing action, zone, relative timestamp, and priority badge
- **SSE connection status indicator** in Topbar (Synced / Connecting / Disconnected) — updated to reflect Supabase Realtime connection state
- **Enhanced executive export** — JSON export includes intervention history and escalation probability
- **AI Prediction Panel** — multi-client intervention sync and improved recommendation UX
- **Operator-dispatched intervention visual indicators** — distinguishes operator-dispatched from auto-applied interventions in the active mitigations list
- **Map style picker** — six styles: Standard, Silver, Dark, Night, Retro, Satellite
- **Map navigation lock button** — prevents accidental panning while reviewing corridor data
- **Map discoverability improvements** — feature hints, quickstart presets strip, corridor summary bar, corridor labels, school popovers
- **Compact portfolio heatmap** — smaller cards and tighter grid for better overview density
- **Interactive Corridor Traffic Map** — full school-level drill-down with congestion visualization, time slider, weather, what-if, geofences, parent flow, and incident overlays; 9-improvement refactor

### Fixed
- School picker not navigating away from Lincoln Elementary when another school selected
- Zoom level not preserved correctly when switching between schools in the picker
- Lincoln Elementary initial zoom now uses actual school-level zoom instead of overview zoom

---

## 2026-02-21

### Added
- **Dark mode** — full dark/light theme toggle via `ThemeProvider`; all pages, components, and procurement pack pages support `dark:` Tailwind variants
- **Responsive mobile layout** — hamburger menu, collapsible sidebar, adaptive padding for small screens
- **Role-based navigation** — Sidebar filters links by authenticated role; logo routes to role's default page
- **Authentication UI** — username display and logout button in Topbar; settings page restricted to admin role
- **Unit test infrastructure** — Node.js built-in test runner with `tsx` loader; tests for escalation, anomaly, and simulation engines

### Changed
- Simulation engine refined to apply proportional risk reduction scaled by base escalation factor (30% base + 70% dynamic)

### Docs
- Comprehensive README added with quick start, environment variables, authentication, architecture overview, and deployment guide

---

## 2026-02-20

### Added
- **AI Operational Brief panel** — generates natural-language executive summaries via OpenAI GPT-4.1-mini; includes executive summary, key drivers, recommendation, caveats, and confidence score
- **Explain Why section** in AI Brief panel — shows input context (risk score, escalation probability, active interventions) used to generate the brief
- **Escalation and anomaly engines** integrated into Executive Command Brief and Operations Dashboard pages

---

## 2026-02-19

### Added
- **3-tier role architecture** — Executive, Operations, and Governance views with separate routes, pages, and access controls
- **Procurement Pack** — six documentation pages (Architecture, Security, Performance, Deployment, Risk, Integration) with JSON export; data sourced from `/public/mock/procurement/`
- **Predictive intelligence engines** — three pure-function, deterministic engines:
  - **Escalation Probability** (`lib/engines/escalation.ts`) — weighted 4-factor model
  - **Anomaly Detection** (`lib/engines/anomaly.ts`) — density deviation, speed variance, confidence band violation
  - **What-If Simulation** (`lib/engines/simulation.ts`) — projects risk reduction under hypothetical interventions
- **Scenario-aware data loading** — four demo scenarios (normal, surge, weather, dismissal) each with separate snapshot, incident, and school JSON files
- **Next.js App Router** routing with middleware-based route guards
- **Initial Next.js project** setup with Codacy CLI integration
