import { CheckCircle2, CircleDashed, Construction, ShieldCheck } from "lucide-react";
import type { Tab } from "../../types/admin";

const content: Record<"violations" | "ratings" | "terms", {
  eyebrow: string;
  title: string;
  description: string;
  scope: string[];
}> = {
  violations: {
    eyebrow: "BPLO SAFETY & COMPLIANCE",
    title: "Violation & Penalty Management",
    description: "This workspace will record, track, and communicate official driver violations and corresponding BPLO penalties.",
    scope: ["Driver-linked violation records", "Penalty details, due dates, and status", "Evidence and administrative notes", "Driver delivery and read acknowledgement"],
  },
  ratings: {
    eyebrow: "BPLO SAFETY & COMPLIANCE",
    title: "Rating Management",
    description: "This workspace will provide accountable access to driver rating statistics, individual rating records, and reset controls.",
    scope: ["Driver rating summaries and trends", "Rating-record search and filters", "Ride-linked rating context", "Reason-required, audited rating reset"],
  },
  terms: {
    eyebrow: "BPLO COMMUNICATION & POLICY",
    title: "Terms & Conditions Management",
    description: "This workspace will manage the official, versioned terms and conditions presented to TriSafe users.",
    scope: ["Draft and published policy versions", "Effective dates and publication history", "Preview before publication", "Current terms retrieval for users"],
  },
};

export function FeatureRoadmapPanel({ tab }: { tab: Extract<Tab, "violations" | "ratings" | "terms"> }) {
  const feature = content[tab];
  return (
    <section className="card feature-roadmap-panel">
      <div className="feature-roadmap-icon"><Construction aria-hidden="true" /></div>
      <span className="eyebrow">{feature.eyebrow}</span>
      <h2>{feature.title}</h2>
      <p>{feature.description}</p>
      <div className="feature-roadmap-status">
        <CircleDashed aria-hidden="true" />
        <div><strong>Planned in the next implementation phase</strong><span>The navigation and BPLO feature structure are ready; database records and actions will be added next.</span></div>
      </div>
      <div className="feature-roadmap-scope">
        <h3>Planned capability</h3>
        <ul>{feature.scope.map((item) => <li key={item}><CheckCircle2 aria-hidden="true" />{item}</li>)}</ul>
      </div>
      <footer><ShieldCheck aria-hidden="true" /> Existing TriSafe data remains unchanged until this module is implemented and tested.</footer>
    </section>
  );
}
