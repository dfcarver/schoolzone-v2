# Changelog

All notable changes to SchoolZone Digital Twin (MRDT) are documented here.

---

## [Unreleased]

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
