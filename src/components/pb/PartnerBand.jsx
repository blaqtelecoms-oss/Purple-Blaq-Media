import { Link } from "react-router-dom";
import Reveal from "@/components/pb/Reveal";

const STATS = [
  { b: "Web-based", span: "Access from any device" },
  { b: "Secure", span: "Role-based user accounts" },
  { b: "End-to-end", span: "Design to ongoing support" },
  { b: "National", span: "Across South Africa" },
];

export default function PartnerBand({ showAboutButton = false }) {
  return (
    <div className="pb-band">
      <div className="pb-in">
        <Reveal variant="left">
          <div className="pb-eyebrow" style={{ color: "#c9a2ee" }}>
            One partner
          </div>
          <h2 className="pb-h2">
            Multiple <em>capabilities</em>
          </h2>
          <p>
            Outsourced technology support covering system administration, user
            support, troubleshooting, database management, feature development,
            documentation, training, technical consultation and ongoing
            maintenance.
          </p>
          {showAboutButton && (
            <Link
              to="/about"
              className="pb-btn ghost"
              style={{ marginTop: 28, background: "transparent", color: "#fff", borderColor: "#fff" }}
            >
              About Purple Blaq
            </Link>
          )}
        </Reveal>
        <div className="pb-stats">
          {STATS.map((s, i) => (
            <Reveal key={s.b} variant="scale" delay={i * 100} className="pb-stat">
              <b>{s.b}</b>
              <span>{s.span}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}