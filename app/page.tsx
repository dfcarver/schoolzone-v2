import Link from "next/link";

const LIVE_ALERTS = [
  { id: "RZ-0041", time: "07:48", zone: "Lincoln ES — Zone 3",    type: "Congestion Risk +68% · Arrival window open",       severity: "Critical" as const, delay: "0s" },
  { id: "RZ-0040", time: "07:44", zone: "Jefferson MS — Zone 1",  type: "Queue spillback onto Oak Ave",                     severity: "Critical" as const, delay: "0.12s" },
  { id: "RZ-0039", time: "07:39", zone: "Roosevelt ES — Zone 2",  type: "Double-parking density spike",                     severity: "High"     as const, delay: "0.24s" },
  { id: "RZ-0038", time: "07:33", zone: "Madison ES — Zone 4",    type: "Pedestrian crossing saturation",                   severity: "High"     as const, delay: "0.36s" },
  { id: "RZ-0037", time: "07:28", zone: "Washington HS — Zone 1", type: "Late bus cluster — 3 routes",                      severity: "High"     as const, delay: "0.48s" },
  { id: "RZ-0036", time: "07:22", zone: "Franklin ES — Zone 2",   type: "Weather advisory: reduced visibility",              severity: "Medium"   as const, delay: "0.60s" },
  { id: "RZ-0035", time: "07:16", zone: "Adams MS — Zone 3",      type: "Parent drop-off queue 4× baseline",                severity: "Medium"   as const, delay: "0.72s" },
];

const SEVERITY_STYLES = {
  Critical: { dot: "bg-red-500",    badge: "bg-red-950/60 text-red-400 border-red-800" },
  High:     { dot: "bg-orange-500", badge: "bg-orange-950/60 text-orange-400 border-orange-800" },
  Medium:   { dot: "bg-yellow-500", badge: "bg-yellow-950/60 text-yellow-400 border-yellow-800" },
};

const FEATURES = [
  {
    title: "AI Risk Scoring",
    desc: "Six weighted signals — density, queue depth, pedestrian load, bus delay, weather, historical drift — combine into a single 0–100 zone risk index.",
    color: "text-blue-400", bg: "bg-blue-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Live Corridor Map",
    desc: "Real-time TomTom + Google Routes traffic overlaid on each school corridor. Multi-city support across Springfield IL and Abu Dhabi districts.",
    color: "text-cyan-400", bg: "bg-cyan-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    title: "Digital Twin Simulation",
    desc: "Every zone runs a continuous physics-based model. Interventions are simulated before dispatch — predicted risk reduction shown before you act.",
    color: "text-purple-400", bg: "bg-purple-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  {
    title: "Intervention Engine",
    desc: "One-click dispatch of crossing guards, signal timing, advisory messages, and bus re-routes — with live effectiveness tracking per action.",
    color: "text-orange-400", bg: "bg-orange-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Escalation Detection",
    desc: "Drift alerts fire when zone risk exceeds forecasted thresholds. Escalation probability scored 0–100% per corridor in real time.",
    color: "text-green-400", bg: "bg-green-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  {
    title: "Governance & Audit",
    desc: "Every intervention and operator action is logged. Incident tracking, control attestations, and full SLA compliance evidence in one view.",
    color: "text-rose-400", bg: "bg-rose-500/10",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const COMPARISON = [
  ["Manual field observation",           "Digital twin with live sensor feeds"],
  ["Reactive dispatch after incident",   "Predictive intervention before congestion"],
  ["No forecast horizon",                "15-min and 30-min risk forecasting per zone"],
  ["Siloed school-by-school view",       "District-wide corridor map with rollup KPIs"],
  ["Paper-based audit logs",             "Automated governance trail with SLA tracking"],
  ["No effectiveness measurement",       "Intervention ROI tracked per action"],
];

const SCENARIOS = [
  { label: "Scenario A", name: "Lincoln ES — Arrival Surge",       detail: "Risk +68% · Queue spillback onto Lincoln Ave · Guard dispatch",        color: "border-red-500",    href: "/executive" },
  { label: "Scenario B", name: "Jefferson MS — Bus Cluster",        detail: "3 late buses · Parent drop-off 4× baseline · Signal retimed",          color: "border-orange-500", href: "/operations/dashboard" },
  { label: "Scenario C", name: "District-Wide Weather Event",       detail: "Reduced visibility advisory · 12 zones elevated · Pre-emptive staging", color: "border-yellow-500", href: "/executive" },
  { label: "Scenario D", name: "Abu Dhabi Multi-School Coord.",     detail: "Cross-district corridor conflict · Synchronized signal plan",           color: "border-blue-500",   href: "/executive" },
  { label: "Scenario E", name: "Governance Compliance Review",      detail: "SLA attestation · Incident closure · Control audit export",            color: "border-purple-500", href: "/governance/incidents" },
  { label: "Scenario F", name: "Procurement Due Diligence",         detail: "Architecture · Security · Deployment phasing · Risk register",         color: "border-teal-500",   href: "/executive/procurement/architecture" },
];

const MODULE_LINKS = [
  {
    href: "/executive",
    label: "Command Brief",
    desc: "Executive KPIs",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/operations/dashboard",
    label: "Operations",
    desc: "Live dispatch",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    desc: "Traffic trends",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: "/governance/incidents",
    label: "Governance",
    desc: "Incidents & controls",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/operations/queue",
    label: "Work Queue",
    desc: "Operator tasks",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: "/executive/procurement/architecture",
    label: "Procurement",
    desc: "Architecture & SLA",
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
];

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 py-14 sm:py-20 hero-grid">

        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/3 right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-blue-900/20 blur-[80px]" />
        </div>

        <div className="relative w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-blue-950/70 border border-blue-800/60 rounded-full text-xs text-blue-400 font-medium backdrop-blur animate-fade-up">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="hidden sm:inline">Live Demo · Real-Time Traffic Feeds · Multi-City Digital Twin</span>
            <span className="sm:hidden">Live Demo · Digital Twin</span>
          </div>

          {/* Headline */}
          <div className="space-y-3 sm:space-y-4 animate-fade-up animate-fade-up-delay-1">
            <h1 className="text-[2.4rem] leading-[1.1] sm:text-5xl md:text-7xl font-black text-slate-100 tracking-tight">
              Predict School Zone Risk.{" "}
              <span className="gradient-text block sm:inline">Before the Bell Rings.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed pt-1">
              A real-time digital twin that scores every corridor, forecasts congestion 30 minutes out,
              and dispatches interventions — before a single child steps off the curb.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up animate-fade-up-delay-2">
            <Link href="/executive" className="btn-primary text-base px-6 sm:px-7 py-3 sm:py-3.5 w-full sm:w-auto justify-center rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Open Command Brief
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/operations/dashboard" className="btn-secondary text-base px-6 sm:px-7 py-3 sm:py-3.5 w-full sm:w-auto justify-center rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              Operations Dashboard
            </Link>
          </div>

          {/* Live risk feed */}
          <div className="animate-fade-up animate-fade-up-delay-3 mt-8 sm:mt-12">
            <div className="glass max-w-3xl mx-auto overflow-hidden glow-blue">

              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Live Risk Feed</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-slate-500 hidden sm:inline">24 zones monitored</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-900">7 Critical</span>
                </div>
              </div>

              <div className="divide-y divide-slate-800/50">
                {LIVE_ALERTS.map((alert) => {
                  const s = SEVERITY_STYLES[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="alert-stream-row flex items-center gap-2 sm:gap-4 px-4 sm:px-5 py-2.5 sm:py-3 hover:bg-slate-800/30 transition-colors"
                      style={{ animationDelay: alert.delay }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 shrink-0 ${s.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-300 font-medium truncate flex-1 text-left">{alert.zone}</span>
                      <span className="text-xs text-slate-500 truncate hidden md:block max-w-[200px]">{alert.type}</span>
                      <span className="text-xs text-slate-600 shrink-0 font-mono hidden sm:block">{alert.time}</span>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-600 hidden sm:block">Morning arrival window · 07:15 – 08:30</span>
                <span className="text-xs text-slate-600 sm:hidden">07:15 – 08:30 window</span>
                <Link href="/governance/incidents" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors shrink-0">
                  View incidents
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "24",     label: "Zones Monitored",      sub: "Across 2 cities" },
            { value: "30m",    label: "Forecast Horizon",     sub: "Per corridor" },
            { value: "91%",    label: "Intervention Efficacy", sub: "Avg risk reduction" },
            { value: "<2 min", label: "Alert-to-Dispatch",    sub: "Response time" },
          ].map(({ value, label, sub }) => (
            <div key={label} className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-100">{value}</p>
              <p className="text-xs font-semibold text-slate-300">{label}</p>
              <p className="text-xs text-slate-600">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 space-y-8 sm:space-y-10">
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Platform Capabilities</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-100">
            Six signals. One risk score.{" "}
            <span className="gradient-text">Every zone explained.</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Physics-based simulation updated every 60 seconds — not static rules —
            with full evidence chains operators can act on immediately.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map(({ title, desc, color, bg, icon }) => (
            <div key={title} className="card-glow space-y-3 sm:space-y-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <span className={color}>{icon}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scenario callout ─────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-gradient-to-b sm:bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-start md:items-center">

            <div className="space-y-4 sm:space-y-5">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">6 Demo Scenarios</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 leading-snug">
                Real school zone patterns,<br className="hidden sm:block" /> live data.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Six pre-loaded scenarios — Arrival Surge, Bus Cluster, Weather Event,
                Multi-City Coordination, Governance Review, and Procurement Due Diligence —
                each demonstrating a distinct operational or executive use case.
              </p>
              <div className="space-y-2.5">
                {SCENARIOS.map(sc => (
                  <Link
                    key={sc.label}
                    href={sc.href}
                    className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all hover:bg-slate-900 group"
                  >
                    <div className={`w-0.5 self-stretch rounded-full ${sc.color} bg-current shrink-0`} style={{ minHeight: 36 }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400">{sc.label}</span>
                        <span className="text-xs font-semibold text-slate-200">{sc.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{sc.detail}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-700 group-hover:text-slate-400 shrink-0 self-center transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Before / After */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Old Way</p>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  {COMPARISON.map(([old]) => (
                    <div key={old} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-700 mt-1.5 shrink-0" />
                      <p className="text-xs text-slate-500 leading-relaxed">{old}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/10 p-4">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">SchoolZone DT</p>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  {COMPARISON.map(([, next]) => (
                    <div key={next} className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs text-slate-400 leading-relaxed">{next}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Module links ─────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 space-y-8 sm:space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Explore the Platform</h2>
          <p className="text-slate-400 text-sm">Every module is pre-loaded with live traffic data. No setup required.</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MODULE_LINKS.map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-xl border border-slate-800 bg-slate-900 hover:border-blue-800/50 hover:bg-slate-900/80 transition-all text-center"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 group-hover:bg-blue-950/50 flex items-center justify-center transition-colors text-slate-400 group-hover:text-blue-400">
                {icon}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-300 group-hover:text-slate-100 transition-colors">{label}</p>
                <p className="text-xs text-slate-600 mt-0.5 hidden sm:block">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            FERPA-aware design
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Live TomTom + Google Routes
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            No PII stored
          </span>
        </div>
      </section>

    </div>
  );
}
