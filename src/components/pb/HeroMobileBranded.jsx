import { Link } from "react-router-dom";
import { LOGO_URL, HERO_BG_URL, CONTACT } from "@/lib/pbConstants";
import { IconPin, IconPhone, IconMail } from "@/components/pb/Icons";

const CHIPS = [
  "Workflow Systems",
  "Business Applications",
  "Process Automation",
  "Digital Solutions",
];

export default function HeroMobileBranded() {
  return (
    <div className="pb-hero__mobile">
      <img
        className="pb-hero__mobile-logo"
        data-a="1"
        src={LOGO_URL}
        alt="Purple Blaq Media logo"
      />
      <div className="pb-hero__mobile-brand" data-a="1">
        Purple Blaq Media
      </div>
      <div className="pb-hero__mobile-tag" data-a="2">
        Technology. Workflow. Digital Solutions.
      </div>

      <div className="pb-hero__stage" data-a="3">
        <img
          src={HERO_BG_URL}
          alt="Purple Blaq Media web-based workflow system dashboard on a laptop"
        />
        <h1 className="pb-hero__stage-title">
          <span>Digital Systems</span>That Make Business<br />Work Better
        </h1>
      </div>

      <div className="pb-hero__chips" data-a="4">
        {CHIPS.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>

      <div className="pb-hero__mobile-cta" data-a="5">
        <Link className="pb-btn" to="/contact">
          Get in touch
        </Link>
        <Link className="pb-btn pb-btn--ghost" to="/services">
          Our services
        </Link>
      </div>

      <div className="pb-hero__mobile-contact pb-hero__mobile-contact--1" data-a="5">
        <span className="pb-hero__mobile-ico">
          <IconPin />
        </span>
        <span>{CONTACT.location}</span>
      </div>
      <div className="pb-hero__mobile-contact" data-a="5">
        <span className="pb-hero__mobile-ico">
          <IconPhone />
        </span>
        <span>
          {CONTACT.phones.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="pb-hero__pipe"> | </span>}
              <a href={`tel:${p.replace(/\s/g, "")}`}>{p}</a>
            </span>
          ))}
        </span>
      </div>
      <div className="pb-hero__mobile-contact" data-a="5">
        <span className="pb-hero__mobile-ico">
          <IconMail />
        </span>
        <span>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          <span className="pb-hero__pipe"> | </span>
          <span className="pb-hero__more">{CONTACT.website}</span>
        </span>
      </div>
    </div>
  );
}