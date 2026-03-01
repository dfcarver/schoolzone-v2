# SchoolZone Digital Twin — Product Specification

**Document version:** 1.0
**Platform version:** Current (Next.js 14, App Router)
**Owner:** Abu Dhabi Department of Transport
**Classification:** Proprietary

---

## Table of Contents

1. [Overview](#1-overview)
2. [Stakeholders & Roles](#2-stakeholders--roles)
3. [System Architecture](#3-system-architecture)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Feature Specifications](#5-feature-specifications)
   - 5.1 Executive Command Brief
   - 5.2 Corridor Traffic Map
   - 5.3 Portfolio Risk Heatmap
   - 5.4 Predictive Intelligence Engines
   - 5.5 AI Operational Briefing
   - 5.6 Intervention Dispatch & Audit Trail
   - 5.7 What-If Simulation
   - 5.8 Weather Impact Modeling
   - 5.9 Parent Pick-Up Queue Modeling
   - 5.10 Incident Management
   - 5.11 Operations Dashboard
   - 5.12 Governance & Controls
   - 5.13 Procurement Pack
   - 5.14 Notifications
   - 5.15 Demo / Config System
6. [Data Models](#6-data-models)
7. [API Endpoints](#7-api-endpoints)
8. [External Integrations](#8-external-integrations)
9. [State Management](#9-state-management)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Project Structure](#11-project-structure)
12. [Environment & Deployment](#12-environment--deployment)
13. [Known Constraints & Limitations](#13-known-constraints--limitations)

---

## 1. Overview

**SchoolZone Digital Twin (MRDT)** — Monitoring, Risk & Digital Twin — is an operational intelligence platform for school zone traffic safety. It provides government transportation officials with real-time risk visualization, predictive analytics, scenario modeling, AI-powered briefings, and intervention management across a portfolio of school zones.

### Primary Goals

- Monitor corridor congestion and risk in real time across all school zones
- Predict risk escalation before incidents occur using deterministic, auditable engines
- Enable operators to dispatch interventions and track their effectiveness
- Support executive decision-making through AI-generated operational briefs
- Model "what-if" scenarios (weather, dismissal timing, diversions) for proactive planning
- Present procurement-ready documentation for government evaluation

### Demo Mode

The platform is designed to function as a **procurement demonstration system** — all telemetry, incidents, and snapshot data are served from static mock JSON files. The demo is deterministic and reproducible, requiring no live sensor infrastructure. Real integrations (Google Maps, OpenAI, Supabase) are live.

---

## 2. Stakeholders & Roles

| Role | Username | Description | Default Route |
|------|----------|-------------|---------------|
| **Executive** | `executive` | Department leadership; reads briefings, heatmaps, KPIs | `/executive` |
| **Operator** | `operator` | Field operations; manages zones, applies interventions | `/operations/dashboard` |
| **Governance** | `governance` | Compliance and audit; reviews incidents, controls | `/governance/incidents` |
| **Admin** | `admin` | System administrator; full access including settings | `/dashboard` |

---

## 3. System Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.21 |
| Language | TypeScript | 5.7.3 |
| UI | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.17 |
| Charts | Recharts | 2.13.3 |
| Maps | Google Maps API (`@react-google-maps/api`) | 2.20.8 |
| Real-time Backend | Supabase (PostgreSQL + Realtime) | 2.48.0 |
| AI | OpenAI API (GPT-4.1-mini) | — |
| Testing | Node.js built-in test runner + `tsx` | — |
| Hosting | Vercel | — |

### Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│                    Browser / Client                  │
│  React Components, Context Providers, useMemo/hooks  │
├─────────────────────────────────────────────────────┤
│                  Next.js App Router                  │
│  Pages (RSC), API Routes, Middleware (route guards)  │
├──────────────────────┬──────────────────────────────┤
│   Static Mock Data   │     External Services        │
│  /public/mock/*.json │  OpenAI · Google Maps        │
│  (Scenarios, Schools │  Supabase (RT + Postgres)    │
│   Incidents, Procure)│                              │
└──────────────────────┴──────────────────────────────┘
```

### Key Design Principles

- **Deterministic analytics:** All predictive engines are pure functions — no external ML dependencies, fully auditable
- **Snapshot-based state:** Telemetry is served from rotating static snapshots, enabling repeatable demos without live sensor feeds
- **Separation of concerns:** Base state (snapshots) and demo mutations (interventions) are kept separate and merged at render time
- **Auditability:** All inputs and outputs to analytics engines are serializable; intervention history is persisted in Supabase

---

## 4. Authentication & Authorization

### Mechanism

Demo-grade client-side authentication. Not suitable for production; designed to be replaced with SSO/OAuth.

### Session Lifecycle

1. User submits credentials at `/login`
2. Credentials validated against hardcoded `CREDENTIALS` map (username → `{ password, role, default_route }`)
3. On success, an `AuthSession` object `{ username, role, authenticated_at }` is:
   - Written to `localStorage` (key: `mrdt_session`)
   - Synced to a browser cookie (`mrdt_session`) for server-side middleware
4. Next.js middleware (`middleware.ts`) enforces cookie-based route protection on every request
5. Client-side `AuthProvider` enforces additional path-level restrictions via `isAuthorizedForPath(role, pathname)`
6. Session persists until sign-out (which clears both localStorage and cookie) or manual storage clear

### Credentials

| Role | Username | Password |
|------|----------|----------|
| Executive | `executive` | `exec2026` |
| Operator | `operator` | `ops2026` |
| Governance | `governance` | `gov2026` |
| Admin | `admin` | `admin2026` |

### Route Access Matrix

| Path Prefix | Executive | Operator | Governance | Admin |
|-------------|:---------:|:--------:|:----------:|:-----:|
| `/executive/**` | ✅ | — | — | ✅ |
| `/operations/**` | — | ✅ | — | ✅ |
| `/governance/**` | — | — | ✅ | ✅ |
| `/settings` | — | — | — | ✅ |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/login` | Public | Public | Public | Public |

---

## 5. Feature Specifications

### 5.1 Executive Command Brief (`/executive`)

The primary view for executive stakeholders. Aggregates all district-level intelligence into a single command view.

#### KPI Row

Six top-level metrics displayed as cards:

| Metric | Description | Source |
|--------|-------------|--------|
| District Risk | Current district risk index (0–100) | `computeDistrictRollup()` |
| High-Risk Window | Forecasted peak risk time | Forecast rollup |
| Interventions | Total interventions applied today | Zone state aggregation |
| Effectiveness | Average risk reduction across active interventions | Simulation engine |
| Governance | Status badge: GREEN / AMBER / RED | `deriveDriftStatus()` |
| Active Alerts | Count of active alerts | `liveState.active_alerts` |

#### Panels (below KPI row)

- **Portfolio Risk Heatmap** — Grid of zone cards with NOW / +15m / +30m risk views (see §5.3)
- **Corridor Traffic Map** — Interactive Google Maps visualization (see §5.2)
- **Emerging Risks** — Zones with forecast peak risk > 0.70
- **Active Mitigations** — Interventions currently applied, with dispatch status
- **Escalation Probability Gauge** — Per-corridor escalation probability (see §5.4.1)
- **AI Operational Brief** — LLM-generated briefing per selected corridor (see §5.5)
- **What-If Simulation Panel** — Hypothetical scenario comparison (see §5.7)
- **Intervention Audit Trail** — Timeline of applied interventions (see §5.6)
- **Executive Summary Export** — Downloads JSON summary of current state

---

### 5.2 Corridor Traffic Map

An interactive Google Maps component rendering the school zone traffic network.

#### Cities / Regions

A dropdown allows switching between three geographic regions. Each region has its own corridors, schools, map center, zoom levels, and bounds restriction.

| City | Center | Default Zoom | Overview Zoom |
|------|--------|:---:|:---:|
| Springfield, IL (USA) | 39.7860, -89.6480 | 19 | 15 |
| Khalifa City, AUH | 24.415, 54.548 | 17 | 14 |
| MBZ City, AUH | 24.371, 54.562 | 17 | 14 |

Switching city resets selected school, zoom level, and pans the map to the new region.

#### Springfield, IL — Schools & Corridors

| Zone | School Name | Type | Enrollment |
|------|-------------|------|:----------:|
| zone-001 | Lincoln Elementary | Elementary | 420 |
| zone-002 | Roosevelt Middle School | Middle | 610 |
| zone-003 | Jefferson High School | High | 1,050 |
| zone-004 | Washington Elementary | Elementary | 385 |
| zone-005 | Adams Middle School | Middle | 540 |

#### Khalifa City, AUH — Schools & Corridors

| Zone | School Name | Type | Enrollment |
|------|-------------|------|:----------:|
| khalifa-001 | Yasmina British Academy | High | 1,200 |
| khalifa-002 | ADNOC Schools Khalifa | Elementary | 650 |
| khalifa-003 | Khalifa International Academy | Middle | 820 |

#### MBZ City, AUH — Schools & Corridors

| Zone | School Name | Type | Enrollment |
|------|-------------|------|:----------:|
| mbz-001 | Aldar Academies MBZ | High | 1,100 |
| mbz-002 | Al Bateen Academy | Elementary | 540 |
| mbz-003 | Emirates National School | Middle | 780 |

#### Map Elements

- **Polylines** — Corridor paths with stroke color (green → red) and width (4–12px) driven by congestion level
- **Circle markers** — School locations with fill color matching congestion
- **Geofence circles** — Configurable radius per zone (280–400m), shown when Geofences feature is enabled
- **Incident markers** — Overlaid at zone coordinates (with small random offset to avoid stacking) when Incidents feature is enabled
- **Traffic Layer** — Google Maps live traffic (optional toggle)
- **Transit Layer** — Google Maps transit overlay (optional toggle)

#### Map Styles

Six visual styles selectable via picker: Standard, Silver, Dark, Night, Retro, Satellite.

#### Toolbar Controls

| Control | Description |
|---------|-------------|
| School picker | Jump to a specific school (zooms and pans to it) |
| Time slider | Scrub time of day (0–1439 min) to animate corridor congestion |
| Weather | Select weather condition affecting congestion |
| Feature toggles | Weather panel, Geofences, Incidents, Parent Flow, What-If, Interventions |
| City picker | Switch between Springfield IL, Khalifa City AUH, MBZ City AUH |

#### Quickstart Presets

Four one-click scenario presets that simultaneously set time, weather, and feature flags:

| Preset | Time | Weather | Features |
|--------|------|---------|----------|
| Rush Hour + Rain | 3:15 PM | Rain | Weather, Geofences, Incidents |
| Dismissal Crisis | 3:30 PM | Clear | Incidents, What-If, Interventions |
| Morning Drop-off | 7:45 AM | Clear | Parent Flow, Interventions |
| Fog Alert | 2:50 PM | Fog | Weather, Geofences, What-If |

---

### 5.3 Portfolio Risk Heatmap

A compact grid showing all zones with risk at three time horizons.

- **Time horizons:** NOW, +15 minutes, +30 minutes
- **Risk source:** `computeHeatmap()` reads current snapshot forecast points
- **Card content:** Zone name, risk value (0–100) per horizon, active intervention badge
- **Color coding:** Green (LOW), Amber (MED), Red (HIGH)
- **Interaction:** Click zone card → navigate to zone detail page

---

### 5.4 Predictive Intelligence Engines

Three deterministic, pure-function engines in `lib/engines/`. All inputs and outputs are serializable. No external ML dependencies.

#### 5.4.1 Escalation Probability Engine (`lib/engines/escalation.ts`)

Computes the probability (0–1) that a corridor will escalate to a higher risk tier.

**Inputs:**
- `risk_score` — current risk (0–1)
- `forecast_30m` — array of `{ risk, confidence }` points
- `congestion_index` — current congestion (0–1)
- `forecast_congestion` — forecasted congestion
- `drift_status` — NORMAL | WARNING | CRITICAL

**Computation (weighted sum):**

| Component | Weight | Formula |
|-----------|:------:|---------|
| Risk trend | 45% | `(forecast_peak_risk − current_risk)` clamped to [0, 1] |
| Congestion trend | 25% | `(forecast_congestion − current_congestion)` clamped to [0, 1] |
| Drift weight | 20% | NORMAL: 0, WARNING: 0.3, CRITICAL: 0.6 |
| Confidence factor | 10% | `1 − avg_confidence` |

**Output:** `{ escalation_probability: number, components: { riskTrend, congestionTrend, driftWeight, confidenceFactor } }`

#### 5.4.2 Anomaly Detection Engine (`lib/engines/anomaly.ts`)

Classifies zone conditions as ADVISORY, SIGNIFICANT, or CRITICAL.

**Inputs:**
- `vehicle_count` — observed count
- `predicted_vehicle_count` — forecast count
- `speed_samples` — array of speed readings
- `current_risk` — current risk score
- `forecast_upper_bound` — upper confidence bound from forecast

**Computation (weighted sum):**

| Component | Weight | Formula |
|-----------|:------:|---------|
| Density deviation | 40% | `abs(observed − forecast) / forecast`, sigmoid-normalized |
| Speed variance | 30% | `variance(speed_samples)`, sigmoid-normalized |
| Confidence band violation | 30% | 1.0 if `current_risk > forecast_upper_bound`, else 0 |

**Classification thresholds:** Score < 0.35 → ADVISORY; 0.35–0.65 → SIGNIFICANT; > 0.65 → CRITICAL

#### 5.4.3 What-If Simulation Engine (`lib/engines/simulation.ts`)

Projects adjusted forecast risk under a hypothetical intervention.

**Intervention multipliers (base reduction):**

| Intervention | Reduction |
|-------------|:---------:|
| SIGNAL_TIMING | 18% |
| TRAFFIC_DIVERSION | 25% |
| ENFORCEMENT | 12% |

**Scaling:** Effective reduction = `base_reduction × (0.30 + 0.70 × escalation_probability)`

**Output:** `{ adjusted_forecast, adjusted_escalation_probability, risk_delta }`

---

### 5.5 AI Operational Briefing (`/api/brief`)

Generates a natural-language operational summary for a selected corridor using OpenAI GPT-4.1-mini.

#### Request (POST `/api/brief`)

```typescript
{
  corridor_id: string
  corridor_name: string
  drift_status: "NORMAL" | "WARNING" | "CRITICAL"
  risk_score: number
  congestion_index: number
  forecast: Array<{
    horizon_minutes: number
    predicted_risk_score: number
    predicted_congestion_index: number
    confidence_score: number
  }>
  active_interventions: Array<{
    intervention_id: string
    status: string
    proposed_action: string
  }>
  escalation_probability?: number
}
```

#### Response

```typescript
{
  executive_summary: string      // 2–3 sentence overview
  drivers: Array<{
    factor: string
    evidence: string
  }>
  recommendation: {
    action: string
    rationale: string
    expected_impact: string
  }
  caveats: string[]
  confidence: number             // 0.0–1.0
}
```

#### Behavior

- LLM temperature: **0.2** (low, for consistency)
- Response format: JSON (enforced via OpenAI `response_format: { type: "json_object" }`)
- Drift lock: If `drift_status === "CRITICAL"`, prompt constrains `recommendation.action` to `"No mutation allowed"`
- Correlation: Every response includes `X-Correlation-Id` header for traceability
- Fallback: If `AI_NARRATIVE_ENABLED=false` or `OPENAI_API_KEY` is missing, returns a deterministic `FALLBACK_BRIEF`
- Errors: Returns structured error objects with `code` (`NO_API_KEY`, `INVALID_REQUEST`, `CONTRACT_VIOLATION`, `LLM_ERROR`)

---

### 5.6 Intervention Dispatch & Audit Trail

Operators apply recommended interventions to zones. The action is persisted and broadcast to all connected clients.

#### Dispatch Flow

1. Operator selects a recommendation from a zone's recommendation list
2. Client POSTs `{ zoneId, recommendation }` to `POST /api/interventions`
3. API inserts a record into the Supabase `interventions` table
4. Supabase Realtime broadcasts the INSERT to all subscribed clients
5. Each client's `LiveStateProvider` receives the broadcast and replays the intervention onto its base snapshot
6. UI updates: zone risk and recommendation list reflect the applied intervention

#### Intervention Record

```typescript
{
  id: string           // UUID (Supabase-generated)
  zone_id: string
  recommendation: Recommendation  // JSONB
  applied_at: string   // ISO timestamp
}
```

#### Audit Trail (InterventionFeed)

- Displays last N interventions in reverse-chronological order
- Shows relative time ("just now", "5m ago", "12m ago")
- Priority badge: HIGH (red) / MED (amber) / LOW (blue)
- Shows zone name and action description
- Highlights interventions applied in the last 10 minutes

#### Map-Level Dispatch (`InterventionDispatch`)

From the corridor map, operators can dispatch interventions directly on a corridor:

| Type | Label | ETA |
|------|-------|-----|
| CROSSING_GUARD | Deploy Crossing Guard | 4 min |
| ENFORCEMENT | Dispatch Traffic Officer | 6 min |
| SIGNAL_TIMING | Adjust Signal Timing | Immediate |
| TRAFFIC_DIVERSION | Activate Traffic Diversion | 2 min |

---

### 5.7 What-If Simulation

Interactive "what if I applied this intervention?" comparison.

#### Scenario Library

| ID | Label | Dismissal Shift | Congestion Reduction | Peak Spread |
|----|-------|:---------------:|:--------------------:|:-----------:|
| `dismissal_early_30` | Dismissal 30 min earlier | −30 min | 0% | +0 min |
| `dismissal_late_30` | Dismissal 30 min later | +30 min | 0% | +0 min |
| `add_crossing_guard` | Add crossing guard | 0 | −15% | +0 min |
| `signal_timing` | Optimize signal timing | 0 | −20% | +5 min |
| `traffic_diversion` | Traffic diversion | 0 | −30% | +0 min |
| `staggered_dismissal` | Staggered dismissal | 0 | −10% | +15 min |

#### UI Elements

- Scenario selector grid (icon + label buttons)
- Comparison table: Corridor | Current Risk | Projected Risk | Change
- Save scenario (stores to `localStorage` with user-supplied name)
- Load saved scenario (restores scenario ID, time of day, weather)
- Export individual scenario or all saved scenarios as JSON
- Delete saved scenario

#### Persistence

Saved scenarios stored in `localStorage` under key `schoolzone-saved-scenarios` as `SavedScenario[]`:

```typescript
{
  id: string
  name: string
  savedAt: number          // epoch ms
  scenarioId: WhatIfScenarioId
  timeMin: number
  weather: WeatherCondition
}
```

---

### 5.8 Weather Impact Modeling

Weather conditions apply a global congestion multiplier and speed reduction to all corridors instantly.

| Condition | Icon | Congestion Multiplier | Speed Reduction | Visibility Note |
|-----------|------|-----------:|:---:|-------------|
| Clear | ☀️ | ×1.00 | 0 mph | Normal visibility |
| Rain | 🌧️ | ×1.35 | −5 mph | Reduced visibility — wet roads increase stopping distance |
| Fog | 🌫️ | ×1.25 | −8 mph | Low visibility — reduced sight lines at crosswalks |

Weather is selectable from the `WeatherPanel` (when the Weather feature toggle is active) or via Quickstart presets.

---

### 5.9 Parent Pick-Up Queue Modeling

Models the vehicle queue that builds up at each school before and after dismissal.

#### Model Parameters

- **Pick-up rate:** 65% of enrolled students are picked up by car
- **Arrival distribution:** Gaussian, centered 5 min before dismissal time, spread = 12 min
- **Departure ramp:** Linear from 0 at dismissal to full rate over 15 min
- **Default dismissal times:** Elementary 3:00 PM, Middle 3:15 PM, High 3:30 PM
- **Queue drain:** After 20 min post-dismissal, tail models exponential decay

#### Output (per school per minute)

```typescript
{
  minuteOfDay: number
  queueLength: number       // vehicles waiting
  waitTimeMin: number       // estimated wait (queue × 0.5 min/vehicle)
  arrivalRate: number       // vehicles/min arriving
  departureRate: number     // vehicles/min departing
}
```

#### UI

- School selector (within current city's corridors)
- Dismissal time slider (adjustable per school, 0–1439 min)
- Queue bar visualization (green → yellow → orange → red based on queue length)
- Arrival/departure rate display
- Updates corridor congestion calculation in real time when dismissal time changes

---

### 5.10 Incident Management (`/governance/incidents`)

#### Incident List

- Filterable table: Zone (dropdown), Severity (LOW / MED / HIGH), Status (investigating / monitoring / resolved)
- Columns: Incident ID, Zone, Severity badge, Type, Title, Reported At, Status

#### Incident Detail (`/governance/incidents/[incidentId]`)

- Summary card (title, type, severity, zone, report time)
- Event timeline (chronological list of incident events)
- Model metadata panel:
  - Model name and version
  - Prediction confidence
  - Features used
  - Training data range
  - Inference latency (ms)

#### Incident Data Model

```typescript
{
  incident_id: string
  zone_id: string
  zone_name: string
  severity: "LOW" | "MED" | "HIGH"
  type: string
  title: string
  summary: string
  reported_at: string        // ISO
  status: "investigating" | "monitoring" | "resolved"
  events: IncidentEvent[]
  model_metadata: ModelMetadata
}
```

---

### 5.11 Operations Dashboard (`/operations/dashboard`)

Operational view for zone operators.

#### KPI Cards

- District Risk Index
- Active Alerts count
- Average system latency (ms)
- Camera health percentage
- Forecast horizon (minutes)

#### Zone Overview Grid

- Card per zone: name, risk level badge, vehicle count, pedestrian count, camera health
- Click → zone detail page (`/operations/zones/[zoneId]`)

#### Risk Forecast Chart

- Recharts line/area chart
- Shows forecasted risk over 30-minute horizon for the primary zone
- Confidence band shading

#### Interventions Table

- All zones' active/recent interventions
- Columns: Zone, Action, Applied At, Status badge

---

### 5.12 Governance & Controls

#### Incident Log (`/governance/incidents`)

See §5.10.

#### Control Checklist (`/governance/controls`)

- Checklist of security and operational controls
- Status: Implemented | Demo | Planned
- Grouped by category

---

### 5.13 Procurement Pack (`/executive/procurement/*`)

Six documentation pages presenting the system to procurement evaluators.

| Page | Path | Description |
|------|------|-------------|
| Architecture | `/architecture` | System architecture diagram, principles, layers, contract boundaries |
| Security | `/security` | Security controls, compliance statements, evidence links |
| Performance | `/performance` | SLA table, benchmark metrics, performance KPIs |
| Deployment | `/deployment` | Rollout phases, timelines, training, exit criteria |
| Risk | `/risk` | Risk matrix (likelihood × impact), mitigations, status |
| Integration | `/integration` | Integration readiness, system boundaries, contract types |

All data is sourced from `/public/mock/procurement/*.json`.
Pages include an **Export JSON** button to download the source data.

---

### 5.14 Notifications

- In-app notification bell in the Topbar with unread badge count
- `NotificationPanel` slides in from the bell button
- Notifications pushed via `useNotifications().push()`
- Actions: mark individual as read, mark all as read, clear all

---

### 5.15 Demo / Config System

#### Demo Scenarios

Four pre-built scenarios, each with its own mock data (schools, snapshots, incidents):

| Scenario | Description |
|----------|-------------|
| `normal` | Baseline school day traffic |
| `surge` | Peak congestion event |
| `weather` | Poor weather conditions |
| `dismissal` | School dismissal peak |

Selected via the **Demo** dropdown in the Topbar. Changing scenario reloads all data.

#### Demo Config (`DemoConfigProvider`)

Persisted to `localStorage` (key: `mrdt-demo-config`):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `scenario` | ScenarioId | `"normal"` | Active demo scenario |
| `snapshotIntervalMs` | number | 5000 | Snapshot polling interval |
| `timeMode` | `"live"` \| `"paused"` | `"live"` | Auto-advance or manual |
| `demoMutationEnabled` | boolean | `true` | Allow intervention mutations |
| `runtimeValidationEnabled` | boolean | `true` | Validate snapshot schema |

#### Snapshot Rotation

Three phases cycle to simulate time progression:

```
INITIAL → SNAPSHOT_1 ↔ SNAPSHOT_2 (repeating)
```

- INITIAL / SNAPSHOT_1 → `live_state_1.json`
- SNAPSHOT_2 → `live_state_2.json`

#### Demo Mutation Tracking

- Demo interventions prefixed with `demo-int-`
- Demo events marked with `[Demo]` prefix in the event log
- Merge function strips old demo interventions when a new snapshot rotation occurs
- Real interventions (from Supabase) are replayed on top of every base snapshot

---

## 6. Data Models

### Core Live State

```typescript
type RiskLevel = "LOW" | "MED" | "HIGH"

interface ForecastPoint {
  time: string
  risk: number            // 0–1
  confidence: number      // 0–1
}

interface Recommendation {
  id: string
  action: string
  impact: string
  confidence: number
  priority: RiskLevel
}

interface Intervention {
  id: string
  action: string
  applied_at: string      // HH:MM:SS
  status: "active" | "en_route" | "pending" | "completed"
}

interface ZoneLiveState {
  zone_id: string
  name: string
  risk_level: RiskLevel
  risk_score: number      // 0–1
  speed_avg_mph: number
  pedestrian_count: number
  vehicle_count: number
  active_cameras: number
  total_cameras: number
  forecast_30m: ForecastPoint[]
  recommendations: Recommendation[]
  events: ZoneEvent[]
  interventions: Intervention[]
}

interface LiveState {
  snapshot_id: string
  timestamp: string       // ISO
  district_risk: RiskLevel
  active_alerts: number
  avg_latency_ms: number
  camera_health_pct: number
  forecast_horizon_min: number
  zones: ZoneLiveState[]
}
```

### School Master Data

```typescript
interface School {
  zone_id: string
  name: string
  address: string
  lat: number
  lng: number
  type: "elementary" | "middle" | "high"
  enrollment: number
  cameras: number
}
```

### Corridor Map Definition

```typescript
interface CorridorDef {
  id: string
  school: {
    name: string
    lat: number
    lng: number
    type: string
    enrollment: number
  }
  path: Array<{ lat: number; lng: number }>
}
```

### Incident

```typescript
interface Incident {
  incident_id: string
  zone_id: string
  zone_name: string
  severity: RiskLevel
  type: string
  title: string
  summary: string
  reported_at: string     // ISO
  status: "investigating" | "monitoring" | "resolved"
  events: IncidentEvent[]
  model_metadata: ModelMetadata
}

interface ModelMetadata {
  model_name: string
  model_version: string
  prediction_confidence: number
  features_used: string[]
  training_data_range: string
  inference_latency_ms: number
}
```

### Authentication

```typescript
type UserRole = "executive" | "operator" | "governance" | "admin"

interface AuthSession {
  username: string
  role: UserRole
  authenticated_at: string  // ISO
}
```

---

## 7. API Endpoints

### POST `/api/brief` — Generate AI Operational Brief

| | |
|--|--|
| **Auth** | None (server-side; requires `OPENAI_API_KEY` env var) |
| **Input** | `AIBriefRequest` (see §5.5) |
| **Output** | `AIBriefResponse` or `{ error: { code, message } }` |
| **Response header** | `X-Correlation-Id: <uuid>` |

Error codes: `NO_API_KEY`, `INVALID_REQUEST`, `CONTRACT_VIOLATION`, `LLM_ERROR`

---

### POST `/api/interventions` — Apply Intervention

| | |
|--|--|
| **Auth** | None (cookie not checked; demo system) |
| **Input** | `{ zoneId: string, recommendation: Recommendation }` |
| **Output** | `{ ok: true }` or `{ error: string }` |
| **Side effect** | Inserts row into Supabase `interventions` table; Realtime broadcasts to clients |

---

### GET `/api/incidents` — Fetch Incidents

| | |
|--|--|
| **Auth** | None |
| **Query params** | `?scenario=normal\|surge\|weather\|dismissal` (validated against whitelist) |
| **Output** | `Incident[]` or `{ error: string }` |
| **Data source** | `/public/mock/scenarios/{scenario}/incidents.json` |

---

## 8. External Integrations

### Google Maps

- **Library:** `@react-google-maps/api` v2.20.8
- **API key env var:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Features used:**
  - `GoogleMap` component with bounds restriction, min/max zoom
  - `Polyline` for corridor paths
  - `Circle` for school markers and geofence rings
  - `Marker` for school and incident overlays
  - `TrafficLayer` for live traffic
  - `TransitLayer` for transit overlay
  - `google.maps.SymbolPath.CIRCLE` for marker icons
  - Map style (6 custom styles via `mapTypeId` / styles array)

### Supabase

- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Table:** `public.interventions` — columns: `id` (uuid), `zone_id` (text), `recommendation` (jsonb), `applied_at` (timestamptz)
- **Realtime:** Subscription to `INSERT` events on `public.interventions`; used to sync intervention state across sessions
- **Startup replay:** On mount, `LiveStateProvider` fetches all stored interventions and replays them onto the current snapshot

### OpenAI

- **Model:** `gpt-4.1-mini`
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Env var:** `OPENAI_API_KEY` (server-side only; never exposed to client)
- **Settings:** Temperature 0.2, `response_format: { type: "json_object" }`
- **Feature flag:** `AI_NARRATIVE_ENABLED` (server env var; set to `"false"` to disable LLM calls)

---

## 9. State Management

The application uses **React Context** throughout — no Redux or Zustand.

### Context Providers (composition order at root)

| Provider | Scope | Persistence |
|----------|-------|-------------|
| `ThemeProvider` | Light / dark mode | `localStorage` |
| `AuthProvider` | Session | `localStorage` + cookie |
| `DemoConfigProvider` | Demo scenario config | `localStorage` |
| `ToastProvider` | Transient toasts | In-memory |
| `NotificationsProvider` | Persistent alerts | In-memory |
| `LiveStateProvider` | Live telemetry + mutations | In-memory + Supabase |

### LiveStateProvider Internals

- Fetches `live_state_1.json` or `live_state_2.json` on interval (default: 5 s)
- Rotates between snapshot phases: INITIAL → SNAPSHOT_1 ↔ SNAPSHOT_2
- Applies demo mutations using `applyDemoIntervention()` from `stateMachine.ts`
- Merges base snapshot + demo overrides via `mergeSnapshotWithOverrides()`
- Subscribes to Supabase Realtime; replays DB interventions on every new snapshot
- Exposes `syncStatus`: `"connecting"` | `"live"` | `"disconnected"`

---

## 10. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Snapshot poll interval | 5 000 ms (configurable) |
| Analytics engine compute time | < 5 ms per zone |
| AI brief generation (P90) | < 8 s (OpenAI network dependent) |
| Map initial load | < 3 s (Google Maps SDK + tiles) |
| Page navigation (client-side) | < 200 ms |

### Reliability

- All analytics engines are pure functions; no external failure modes
- Static mock data eliminates dependency on sensor infrastructure for demo
- AI brief has a fully deterministic fallback; unavailability does not block the rest of the UI
- Supabase connection failure degrades gracefully; `syncStatus` shows "Disconnected", local state continues to function

### Security (Demo Mode)

- Credentials stored in source code — acceptable for procurement demo only
- No secrets exposed to client: `OPENAI_API_KEY` is server-only
- Supabase uses public anonymous key; row-level security not enforced (demo system)
- **Production note:** Replace `AuthProvider` with SSO/OAuth; enforce Supabase RLS; rotate all credentials

### Accessibility

- Dark mode support via `ThemeProvider` and Tailwind `dark:` variants
- Semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<table>`)
- Button labels and `title` attributes on icon-only controls
- Color is never the sole indicator of status (badges always include text)

### Testing

- Unit tests for all three analytics engines (`tests/*.test.ts`)
- Test runner: Node.js built-in `test` module with `tsx` loader (no Jest/Vitest)
- Run: `npm test`

---

## 11. Project Structure

```
schoolzone-v2/
├── app/
│   ├── layout.tsx                      # Root layout (providers)
│   ├── page.tsx                        # Redirect → /executive
│   ├── login/page.tsx                  # Login screen
│   ├── dashboard/page.tsx              # Redirect hub
│   ├── settings/page.tsx               # Admin settings
│   ├── executive/
│   │   ├── page.tsx                    # Executive Command Brief
│   │   ├── zones/[zoneId]/page.tsx     # Zone detail (executive view)
│   │   └── procurement/
│   │       ├── architecture/page.tsx
│   │       ├── security/page.tsx
│   │       ├── performance/page.tsx
│   │       ├── deployment/page.tsx
│   │       ├── risk/page.tsx
│   │       └── integration/page.tsx
│   ├── operations/
│   │   ├── dashboard/page.tsx
│   │   ├── queue/page.tsx
│   │   └── zones/[zoneId]/page.tsx
│   ├── governance/
│   │   ├── incidents/
│   │   │   ├── page.tsx                # Incident log
│   │   │   └── [incidentId]/page.tsx   # Incident detail
│   │   └── controls/page.tsx
│   └── api/
│       ├── brief/route.ts              # POST — AI Operational Brief
│       ├── interventions/route.ts      # POST — Apply intervention
│       └── incidents/route.ts          # GET — Fetch incidents
│
├── components/
│   ├── AppShell.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── CorridorMap.tsx                 # Main map component
│   ├── map/                            # Map sub-components
│   │   ├── MapToolbar.tsx
│   │   ├── WeatherPanel.tsx
│   │   ├── ParentFlowPanel.tsx
│   │   ├── WhatIfPanel.tsx
│   │   ├── InterventionDispatch.tsx
│   │   ├── IncidentOverlay.tsx
│   │   ├── GeofenceLayer.tsx
│   │   ├── CorridorLabels.tsx
│   │   ├── QuickstartStrip.tsx
│   │   └── FeatureHint.tsx
│   ├── intelligence/
│   │   ├── EscalationGauge.tsx
│   │   ├── AnomalyBadge.tsx
│   │   └── SimulationPanel.tsx
│   ├── ai/
│   │   └── AIBriefPanel.tsx
│   ├── procurement/
│   │   ├── ArchitectureDiagram.tsx
│   │   ├── ControlChecklist.tsx
│   │   ├── DeploymentPhases.tsx
│   │   ├── IntegrationReadiness.tsx
│   │   ├── PerformanceSlaTable.tsx
│   │   ├── RiskMatrixTable.tsx
│   │   └── (utility components)
│   └── (shared: KPI, RiskHeatmap, ForecastChart, InterventionFeed, etc.)
│
├── lib/
│   ├── types.ts                        # Core data types
│   ├── auth/
│   │   ├── types.ts                    # Credentials, roles, route matrix
│   │   └── AuthProvider.tsx
│   ├── ai/
│   │   ├── types.ts
│   │   ├── buildRequest.ts
│   │   └── briefPrompt.ts
│   ├── engines/
│   │   ├── escalation.ts
│   │   ├── anomaly.ts
│   │   ├── simulation.ts
│   │   ├── buildInputs.ts
│   │   ├── normalize.ts
│   │   └── types.ts
│   ├── hooks/
│   │   ├── useCongestionEngine.ts
│   │   └── useGeofenceAlerts.ts
│   ├── LiveStateProvider.tsx
│   ├── demoConfig.tsx
│   ├── stateMachine.ts
│   ├── rollups.ts
│   ├── mapFeatures.ts
│   ├── data.ts
│   ├── validate.ts
│   ├── metrics.ts
│   ├── export.ts
│   ├── logger.ts
│   ├── notifications.tsx
│   ├── supabase.ts
│   └── ThemeProvider.tsx
│
├── middleware.ts                        # Next.js route guard
├── tests/
│   ├── escalation.test.ts
│   ├── anomaly.test.ts
│   └── simulation.test.ts
├── public/
│   └── mock/
│       ├── scenarios/
│       │   ├── normal/
│       │   ├── surge/
│       │   ├── weather/
│       │   └── dismissal/
│       │       ├── schools.json
│       │       ├── live_state_1.json
│       │       ├── live_state_2.json
│       │       └── incidents.json
│       └── procurement/
│           ├── architecture.json
│           ├── security.json
│           ├── performance.json
│           ├── deployment.json
│           ├── risk.json
│           └── integration.json
└── docs/
    └── SPECIFICATION.md                 # This document
```

---

## 12. Environment & Deployment

### Environment Variables

| Variable | Required | Where | Description |
|----------|:--------:|-------|-------------|
| `OPENAI_API_KEY` | Yes* | Server-only | OpenAI API key for AI briefing |
| `AI_NARRATIVE_ENABLED` | No | Server | Set `"false"` to disable LLM calls (returns fallback). Default: `"true"` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Client | Google Maps JavaScript API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client | Supabase anonymous API key |

\* Required only for AI brief feature; all other features work without it.

### Local Development

```bash
cp .env.local.example .env.local   # Copy template
# Fill in env vars
npm install
npm run dev                         # http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

### Deployment (Vercel)

- Push to `main` triggers auto-deploy via Vercel Git integration
- Set all env vars in Vercel project settings
- No infrastructure to provision beyond Supabase tables and Google Maps/OpenAI API keys

### Supabase Setup

Create the `interventions` table:

```sql
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  zone_id text not null,
  recommendation jsonb not null,
  applied_at timestamptz not null default now()
);

alter table public.interventions enable row level security;
-- For demo: allow anonymous reads and inserts
create policy "allow all" on public.interventions for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.interventions;
```

---

## 13. Known Constraints & Limitations

| Area | Constraint |
|------|------------|
| **Authentication** | Demo-grade only. Credentials hardcoded in source. No token expiry. Not suitable for production. |
| **Data** | All telemetry is static mock data. No live sensor integration in current build. |
| **Supabase access control** | Public anonymous access with no RLS enforcement. All users can read and insert interventions. |
| **AI brief latency** | Dependent on OpenAI API response time (typically 3–8 s). No streaming implemented. |
| **Session sharing** | Supabase Realtime syncs interventions across sessions, but snapshot state is client-local; users may see different base states. |
| **Map bounds** | Each city enforces a `restriction.latLngBounds` to prevent panning away. Min zoom is 12. |
| **Incident coordinates** | Incidents are offset randomly from school coordinates. Positions change on every render if `mapIncidentsToCoords()` is called without memoization. |
| **Parent flow model** | Simplified Gaussian model; not calibrated to real school data. |
| **No mobile layout** | UI is optimized for desktop (1280px+). Sidebar collapses on mobile but map and panels are not fully responsive. |
| **Browser localStorage** | Demo config, auth session, saved what-if scenarios, and theme are all localStorage-based. Clearing storage resets all user preferences. |
