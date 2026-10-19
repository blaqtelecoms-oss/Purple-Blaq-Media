import PageHeader from "@/components/pb/PageHeader";
import ApproachStrip from "@/components/pb/ApproachStrip";
import Reveal from "@/components/pb/Reveal";
import Commitment from "@/components/pb/Commitment";
import CTA from "@/components/pb/CTA";
import { useSeo } from "@/hooks/useSeo";

const STEP_DETAILS = [
  { n: "01", b: "Understand", p: "We learn your goals, your people and your pain points." },
  { n: "02", b: "Map", p: "We document your current processes and find the gaps." },
  { n: "03", b: "Build", p: "We build the system around your workflow." },
  { n: "04", b: "Implement", p: "We launch it together with your team." },
  { n: "05", b: "Support", p: "We provide training and day-to-day help." },
  { n: "06", b: "Improve", p: "We refine the system as your business grows." },
];

export default function Approach() {
  useSeo(
    "How We Work | Purple Blaq Media",
    "From idea to working system: understand, map, build, implement, support and improve — our six-step approach."
  );
  return (
    <>
      <PageHeader
        eyebrow="Our approach"
        title="From idea to <em>working system</em>"
      />
      <ApproachStrip />
      <section className="pb-blk" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="pb-eyebrow">In detail</div>
          <h2 className="pb-h2">
            Every step, <em>explained</em>
          </h2>
        </Reveal>
        <div className="pb-stepcards">
          {STEP_DETAILS.map((s) => (
            <Reveal key={s.n} className="pb-stepcard">
              <div className="n">{s.n}</div>
              <div>
                <h3>{s.b}</h3>
                <p>{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <Commitment />
      <CTA />
    </>
  );
}