import { Link } from "react-router-dom";
import Reveal from "@/components/pb/Reveal";
import ServiceIllustration from "@/components/pb/ServiceIllustration";
import {
  IconWorkflow,
  IconWebApp,
  IconProcess,
} from "@/components/pb/Icons";

const CARDS = [
  {
    Icon: IconWorkflow,
    title: "Workflow Systems",
    text: "Centralise internal workflows, approvals, document management, tasks, portals, reporting and notifications in one place.",
  },
  {
    Icon: IconWebApp,
    title: "Web Applications",
    text: "Customised apps with secure user accounts, dashboards, databases, forms, workflow stages, reporting and integrations.",
  },
  {
    Icon: IconProcess,
    title: "Process Digitisation",
    text: "Turn email, WhatsApp, Excel, paper forms and manual follow-ups into structured digital processes with better visibility.",
  },
];

export default function ServicesPreview() {
  return (
    <section className="pb-blk">
      <Reveal variant="up">
        <div className="pb-eyebrow">What we deliver</div>
        <h2 className="pb-h2">
          Systems built around <em>how you work</em>
        </h2>
        <p className="pb-lead">
          We design, develop, implement and support web-based systems that
          replace scattered spreadsheets, WhatsApp chains and paper with one
          connected, trackable process.
        </p>
      </Reveal>
      <div className="pb-cards">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} variant="up" delay={i * 120} className="pb-card">
            <ServiceIllustration service={c.title} className="pb-card-ill" />
            <div className="pb-ico">
              <c.Icon />
            </div>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </Reveal>
        ))}
      </div>
      <div style={{ marginTop: 40 }}>
        <Link to="/services" className="pb-btn ghost">
          See all services
        </Link>
      </div>
    </section>
  );
}