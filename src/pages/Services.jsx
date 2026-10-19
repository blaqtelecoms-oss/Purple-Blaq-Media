import PageHeader from "@/components/pb/PageHeader";
import Reveal from "@/components/pb/Reveal";
import ServicePhoto from "@/components/pb/ServicePhoto";
import PartnerBand from "@/components/pb/PartnerBand";
import CTA from "@/components/pb/CTA";
import { useSeo } from "@/hooks/useSeo";
import {
  IconWorkflow,
  IconWebApp,
  IconProcess,
  IconCheck,
} from "@/components/pb/Icons";

const SERVICES = [
  {
    Icon: IconWorkflow,
    title: "Workflow Systems",
    text: "Centralise internal workflows, applications, approvals, document management, tasks, portals, reporting, notifications and digital records.",
    ticks: [
      "Internal workflows & approvals",
      "Document management",
      "Tasks & portals",
      "Reporting & notifications",
      "Digital records",
    ],
  },
  {
    Icon: IconWebApp,
    title: "Web Applications",
    text: "Customised web applications with secure user accounts, dashboards, databases, forms, workflow stages, reporting and integrations.",
    ticks: [
      "Secure user accounts",
      "Dashboards & databases",
      "Forms & workflow stages",
      "Reporting",
      "Integrations",
    ],
  },
  {
    Icon: IconProcess,
    title: "Process Digitisation",
    text: "Turn email, WhatsApp, Excel, paper forms and manual follow-ups into structured digital processes with better visibility.",
    ticks: [
      "Email & WhatsApp",
      "Excel replacement",
      "Paper forms to digital",
      "Manual follow-ups automated",
      "Better visibility",
    ],
  },
];

const SUPPORT_ITEMS = [
  "System administration",
  "User support",
  "Troubleshooting",
  "Database management",
  "Feature development",
  "Documentation",
  "Training",
  "Technical consultation",
  "Ongoing maintenance",
];

export default function Services() {
  useSeo(
    "Services | Purple Blaq Media",
    "Workflow systems, web applications and process digitisation built around how your business works."
  );
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Digital systems <em>for every workflow</em>"
        lead="We build web-based systems that replace scattered spreadsheets, WhatsApp chains and paper with one connected, trackable process."
      />

      {SERVICES.map((s, i) => (
        <section
          key={s.title}
          className={`pb-svc ${i % 2 === 1 ? "reverse" : ""}`}
        >
          <Reveal className="pb-svc-art">
            <ServicePhoto service={s.title} className="pb-svc-ill-art" />
            <div className="pb-ico pb-ico--badge">
              <s.Icon />
            </div>
          </Reveal>
          <Reveal>
            <div className="pb-eyebrow">{`0${i + 1}`}</div>
            <h2 className="pb-h2" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              {s.title}
            </h2>
            <p className="pb-lead">{s.text}</p>
            <ul className="pb-ticklist">
              {s.ticks.map((t) => (
                <li key={t}>
                  <IconCheck />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      ))}

      <div className="pb-band" style={{ marginTop: 40 }}>
        <div className="pb-in" style={{ gridTemplateColumns: "1fr" }}>
          <Reveal>
            <div className="pb-eyebrow" style={{ color: "#c9a2ee" }}>
              Ongoing support
            </div>
            <h2 className="pb-h2">
              Outsourced <em>technology support</em>
            </h2>
            <p>
              Outsourced technology support covering system administration, user
              support, troubleshooting, database management, feature development,
              documentation, training, technical consultation and ongoing
              maintenance.
            </p>
            <div className="pb-pills">
              {SUPPORT_ITEMS.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <PartnerBand />
      <CTA />
    </>
  );
}