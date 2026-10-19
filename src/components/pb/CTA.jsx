import Reveal from "@/components/pb/Reveal";
import { CONTACT } from "@/lib/pbConstants";

export default function CTA() {
  return (
    <section style={{ paddingTop: 96 }}>
      <Reveal className="pb-cta">
        <div className="pb-eyebrow" style={{ justifyContent: "center", color: "#e0c8f5" }}>
          Let's talk
        </div>
        <h2 className="pb-h2" style={{ marginTop: 14 }}>
          Ready to make your business work better?
        </h2>
        <p>
          Tell us how your team works today and we will show you what a connected
          digital system could look like.
        </p>
        <div className="pb-row">
          <a className="pb-btn" href={`mailto:${CONTACT.email}`}>
            {CONTACT.email}
          </a>
          <a className="pb-btn ghost" href={`tel:${CONTACT.phones[0].replace(/\s/g, "")}`}>
            {CONTACT.phones[0]}
          </a>
        </div>
      </Reveal>
    </section>
  );
}