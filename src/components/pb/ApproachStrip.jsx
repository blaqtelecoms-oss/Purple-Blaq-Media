import { Link } from "react-router-dom";
import Reveal from "@/components/pb/Reveal";

const STEPS = [
  { n: "01", b: "Understand", small: "Your goals, people and pain points" },
  { n: "02", b: "Map", small: "Current processes and gaps" },
  { n: "03", b: "Build", small: "The system around your workflow" },
  { n: "04", b: "Implement", small: "Launch with your team" },
  { n: "05", b: "Support", small: "Training and day-to-day help" },
  { n: "06", b: "Improve", small: "Refine as the business grows" },
];

export default function ApproachStrip({ showButton = false }) {
  return (
    <section className="pb-blk">
      <Reveal variant="up">
        <div className="pb-eyebrow">Our approach</div>
        <h2 className="pb-h2">
          From idea to <em>working system</em>
        </h2>
      </Reveal>
      <div className="pb-steps">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} variant="up" delay={i * 100} className="pb-step">
            <i>{s.n}</i>
            <b>{s.b}</b>
            <small>{s.small}</small>
          </Reveal>
        ))}
      </div>
      {showButton && (
        <div style={{ marginTop: 48 }}>
          <Link to="/approach" className="pb-btn ghost">
            See how we work
          </Link>
        </div>
      )}
    </section>
  );
}