import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LOGO_URL, HERO_BG_URL, CONTACT } from "@/lib/pbConstants";
import { IconPin, IconPhone, IconMail } from "@/components/pb/Icons";
import HeroMobileBranded from "@/components/pb/HeroMobileBranded";

const SLIDES = [
  {
    src: HERO_BG_URL,
    alt: "Purple Blaq Media web-based workflow system dashboard on a laptop",
    audience: "Purple Blaq Media",
    title: "Digital Systems <em>That Work Better</em>",
    message:
      "Web-based workflow systems, business applications and process automation that help your team do more with less effort.",
    cta: { label: "Explore services", to: "/services" },
  },
  {
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    alt: "Operations team reviewing a central workflow dashboard on a laptop",
    audience: "For operations & admin teams",
    title: "One Dashboard for <em>Every Workflow</em>",
    message:
      "Replace scattered spreadsheets and status emails with one central system your whole team can see and trust.",
    cta: { label: "See workflow systems", to: "/services" },
  },
  {
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
    alt: "Growing business team collaborating around digital tools",
    audience: "For growing businesses",
    title: "Systems That <em>Scale With You</em>",
    message:
      "When your team outgrows WhatsApp and shared drives, we build the workflow that keeps everyone in sync as you grow.",
    cta: { label: "See how we help", to: "/services" },
  },
  {
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
    alt: "Team reviewing paper documents to digitise a business process",
    audience: "For paper-heavy organisations",
    title: "From Paper to <em>Process</em>",
    message:
      "Turn forms, approvals and manual follow-ups into a structured digital process with full visibility and audit trail.",
    cta: { label: "Start the conversation", to: "/contact" },
  },
];

export default function Hero() {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(
      () => setActive((a) => (a + 1) % SLIDES.length),
      6000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 700px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const slide = SLIDES[active];
  const isOriginal = active === 0;
  const showOriginal = isOriginal && !isMobile;
  const brandedMobile = isMobile && isOriginal;

  return (
    <section className={`pb-hero${brandedMobile ? " pb-hero--branded-mobile" : ""}`}>
      <div className="pb-hero__slides">
        {SLIDES.map((s, i) => (
          <img
            key={i}
            src={s.src}
            alt={i === active ? s.alt : ""}
            aria-hidden={i !== active}
            className={`pb-hero__art ${i === active ? "on" : ""}`}
          />
        ))}
      </div>
      <div
        className={`pb-hero__scrim--dark ${
          showOriginal || brandedMobile ? "" : "on"
        }`}
      />

      <div className="pb-hero__content" key={active}>
        {showOriginal ? (
          <OriginalHero />
        ) : brandedMobile ? (
          <HeroMobileBranded />
        ) : (
          <div className="pb-hero__panel">
            <div className="pb-eyebrow" data-a="1">
              {slide.audience}
            </div>
            <h2
              className="pb-hero__panel-title"
              data-a="2"
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
            <p className="pb-hero__panel-msg" data-a="3">
              {slide.message}
            </p>
            <Link to={slide.cta.to} className="pb-hero__cta" data-a="4">
              {slide.cta.label}
            </Link>
          </div>
        )}
      </div>

      <div className="pb-hero__dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            className={i === active ? "on" : ""}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}

function OriginalHero() {
  return (
    <>
      <img
        className="pb-hero__abs pb-logo"
        data-a="1"
        src={LOGO_URL}
        alt="Purple Blaq Media logo"
      />
      <div className="pb-hero__abs pb-brand" data-a="1">
        Purple Blaq Media
      </div>
      <div className="pb-hero__abs pb-tag" data-a="2">
        Technology. Workflow. Digital Solutions.
      </div>

      <h1 className="pb-hero__abs pb-title" data-a="3">
        <span>Digital Systems</span>That Make Business<br />Work Better
      </h1>

      <div className="pb-hero__abs pb-rule pb-rule--1" />
      <div className="pb-hero__abs pb-services" data-a="4">
        Web-Based Workflow Systems &nbsp;|&nbsp; Business Applications &nbsp;|&nbsp;
        Process Automation &nbsp;|&nbsp; Digital Solutions
      </div>
      <div className="pb-hero__abs pb-rule pb-rule--2" />

      <div className="pb-hero__abs pb-contact pb-contact--1" data-a="4">
        <span className="pb-ico-round">
          <IconPin />
        </span>
        <span>{CONTACT.location}</span>
      </div>
      <div className="pb-hero__abs pb-sep pb-sep--1" />
      <div className="pb-hero__abs pb-contact pb-contact--2" data-a="4">
        <span className="pb-ico-round">
          <IconPhone />
        </span>
        <span>{CONTACT.phones.join("  |  ")}</span>
      </div>
      <div className="pb-hero__abs pb-sep pb-sep--2" />
      <div className="pb-hero__abs pb-contact pb-contact--3" data-a="4">
        <span className="pb-ico-round">
          <IconMail />
        </span>
        <span>
          {CONTACT.email} &nbsp;|&nbsp; {CONTACT.website}
        </span>
      </div>
    </>
  );
}