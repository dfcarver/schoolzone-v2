# SchoolZone Digital Twin — MRDT Platform

**Monitoring, Risk & Digital Twin** platform for Abu Dhabi Department of Transport school zone safety operations.

Built with Next.js 14, React 18, Tailwind CSS, and Recharts.

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local
# Edit .env.local and add your OpenAI API key

# Run development server
npm run dev

# Production build
npm run build && npm start

# Run tests
npm test

# Lint
npm run lint
```

The app runs on **http://localhost:3000** by default.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for AI Brief) | OpenAI API key for operational briefing generation |
| `AI_NARRATIVE_ENABLED` | No | Set to `"false"` to disable LLM calls and return deterministic fallback. Default: `true` |

See `.env.local.example` for reference.

---

## Authentication

The platform uses demo-grade client-side authentication with role-based access control.

### Credentials

| Role | Username | Password | Default Route |
|------|----------|----------|---------------|
| Executive | `executive` | `exec2026` | `/executive` |
| Operator | `operator` | `ops2026` | `/operations/dashboard` |
| Governance | `governance` | `gov2026` | `/governance/incidents` |
| Admin | `admin` | `admin2026` | `/dashboard` |

### Route Access Matrix

| Route | Executive | Operator | Governance | Admin |
|-------|-----------|----------|------------|-------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/executive/**` | ✅ | — | — | ✅ |
| `/operations/**` | — | ✅ | — | ✅ |
| `/governance/**` | — | — | ✅ | ✅ |
| `/settings` | — | — | — | ✅ |
| `/login` | Public | Public | Public | Public |

### Session Model

- Session stored in `localStorage` (key: `mrdt_session`) and synced to a cookie for server-side middleware enforcement.
- No token expiration — session persists until manual sign-out or storage clear.
- Next.js middleware (`middleware.ts`) redirects unauthenticated users to `/login` and unauthorized users to their role's default route.

> **Note:** This is demo-grade auth for procurement presentation. Not suitable for production. Swap `AuthProvider` internals for SSO/OAuth when needed.

---

## Project Structure

```
schoolzone/
├── app/                        # Next.js App Router pages
│   ├── login/                  # Login screen (standalone layout, no sidebar)
│   ├── executive/              # Executive Command Brief
│   │   ├── procurement/        # Procurement Pack (6 sub-pages)
│   │   └── zones/[zoneId]/     # Executive zone detail
│   ├── operations/
│   │   ├── dashboard/          # Operations Dashboard
│   │   ├── queue/              # Work Queue
│   │   └── zones/[zoneId]/     # Operations zone detail
│   ├── governance/
│   │   ├── incidents/          # Incident log & detail
│   │   └── controls/           # Control checklist
│   ├── dashboard/              # General dashboard (redirect hub)
│   ├── settings/               # Admin settings
│   └── api/brief/              # AI Brief API route (POST)
│
├── components/
│   ├── AppShell.tsx            # Auth-aware layout wrapper
│   ├── Sidebar.tsx             # Role-filtered navigation sidebar
│   ├── Topbar.tsx              # Top bar with scenario controls & sign-out
│   ├── intelligence/           # Predictive Intelligence UI
│   │   ├── EscalationGauge.tsx # Escalation probability gauge
│   │   ├── AnomalyBadge.tsx    # Anomaly detection badge
│   │   └── SimulationPanel.tsx # What-If Simulation panel
│   ├── procurement/            # Procurement Pack components
│   │   ├── ArchitectureDiagram.tsx
│   │   ├── ControlChecklist.tsx
│   │   ├── DeploymentPhases.tsx
│   │   ├── IntegrationReadiness.tsx
│   │   ├── PerformanceSlaTable.tsx
│   │   └── RiskMatrixTable.tsx
│   └── (shared UI)             # KPI, Charts, Heatmap, Timeline, etc.
│
├── lib/
│   ├── auth/                   # Authentication system
│   │   ├── types.ts            # Credentials, roles, route access matrix
│   │   └── AuthProvider.tsx    # React context (login/logout/session)
│   ├── ai/                     # AI Briefing Engine
│   │   ├── types.ts            # AIBriefRequest interface
│   │   ├── buildRequest.ts     # Builds request from live state
│   │   └── briefPrompt.ts     # Prompt builder for LLM
│   ├── engines/                # Predictive Intelligence Engines
│   │   ├── escalation.ts       # Escalation Probability Forecasting
│   │   ├── anomaly.ts          # Anomaly Detection Layer
│   │   ├── simulation.ts       # What-If Simulation Engine
│   │   ├── buildInputs.ts      # Engine input builder from live state
│   │   ├── normalize.ts        # Normalization utilities
│   │   └── types.ts            # Engine type definitions
│   ├── LiveStateProvider.tsx    # Real-time state context
│   ├── demoConfig.tsx          # Demo scenario configuration
│   ├── stateMachine.ts         # Zone state machine logic
│   ├── rollups.ts              # Metric rollup calculations
│   ├── metrics.ts              # Metric definitions
│   ├── validate.ts             # Input validation
│   ├── data.ts                 # Static/demo data
│   ├── export.ts               # Data export utilities
│   ├── logger.ts               # Logging utility
│   └── types.ts                # Core type definitions
│
├── middleware.ts                # Next.js route guard (cookie-based)
├── tests/                      # Unit tests (Node test runner + tsx)
│   ├── escalation.test.ts
│   ├── anomaly.test.ts
│   └── simulation.test.ts
└── public/mock/                # Mock JSON data for demo scenarios
```

---

## Predictive Intelligence Engines

Three deterministic, pure-function engines that require no external dependencies:

### Escalation Probability Forecasting (`lib/engines/escalation.ts`)
Computes a 0–1 probability that a zone will escalate to a higher risk tier based on current risk, trend drift, and sensor weights.

### Anomaly Detection Layer (`lib/engines/anomaly.ts`)
Classifies zone conditions as `normal`, `watch`, or `anomaly` based on deviation scores and sensor data patterns.

### What-If Simulation Engine (`lib/engines/simulation.ts`)
Projects adjusted forecast risk timelines under hypothetical intervention scenarios. Scales reduction proportionally with baseline risk and escalation probability.

**Design principles:**
- Pure functions — no side effects, no mutation
- Deterministic — same inputs always produce same outputs
- Audit-friendly — all inputs and outputs are serializable
- Tested — unit tests in `tests/`

---

## AI Operational Briefing

The AI Brief (`/api/brief`) generates natural-language operational summaries using OpenAI's API.

- **Prompt builder** (`lib/ai/briefPrompt.ts`) formats zone state, metrics, and escalation probability into a structured prompt.
- **Request builder** (`lib/ai/buildRequest.ts`) transforms live state into the `AIBriefRequest` interface.
- **Fallback** — when `AI_NARRATIVE_ENABLED=false` or the API key is missing, a deterministic fallback brief is returned.
- **Escalation probability** is included in the brief context when available.

---

## Procurement Pack

Six procurement-ready documentation pages under `/executive/procurement/`:

| Page | Path | Content |
|------|------|---------|
| Architecture | `/executive/procurement/architecture` | System architecture diagram |
| Security & Compliance | `/executive/procurement/security` | Security controls & compliance |
| Performance & SLA | `/executive/procurement/performance` | Performance benchmarks & SLAs |
| Deployment Phasing | `/executive/procurement/deployment` | Rollout phases & timelines |
| Risk Management | `/executive/procurement/risk` | Risk matrix & mitigations |
| Integration | `/executive/procurement/integration` | Integration readiness assessment |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 18, Tailwind CSS 3.4 |
| Charts | Recharts 2.13 |
| AI | OpenAI API (GPT) |
| Testing | Node.js built-in test runner + tsx |
| Deployment | Vercel |

---

## Deployment

Deployed to **Vercel**. Set environment variables in the Vercel dashboard:

```
OPENAI_API_KEY=sk-...
AI_NARRATIVE_ENABLED=true
```

---

## License

Proprietary — Abu Dhabi Department of Transport.
