"use client";

import Link from "next/link";

interface EvidenceLink {
  label: string;
  href: string;
  description: string;
}

const EVIDENCE_LINKS: EvidenceLink[] = [
  {
    label: "Incident Audit Trace",
    href: "/governance/incidents",
    description: "Full incident history with event timelines, model metadata, and provenance records.",
  },
  {
    label: "Governance Controls",
    href: "/governance/controls",
    description: "Validation status, drift monitoring, compliance checklist, and structured audit log.",
  },
  {
    label: "Executive Command Brief",
    href: "/executive",
    description: "District-level risk rollups, heatmap, emerging risks, and executive summary export.",
  },
];

interface EvidenceLinksPanelProps {
  additionalLinks?: EvidenceLink[];
}

export default function EvidenceLinksPanel({ additionalLinks }: EvidenceLinksPanelProps) {
  const links = [...EVIDENCE_LINKS, ...(additionalLinks ?? [])];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Evidence & Governance Artifacts</h4>
      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block border border-gray-100 rounded-lg p-3 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900">{link.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
