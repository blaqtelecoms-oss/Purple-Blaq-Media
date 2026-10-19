import Reveal from "@/components/pb/Reveal";

const TAGS = [
  "More organised",
  "More efficient",
  "More connected",
  "More measurable",
  "More scalable",
];

export default function Commitment() {
  return (
    <div className="pb-commit">
      <div className="pb-in">
        <Reveal variant="left">
          <div className="pb-eyebrow">Our commitment</div>
          <h2 className="pb-h2">
            Better <em>every day</em>
          </h2>
          <p className="pb-lead">
            Purple Blaq Media helps organisations improve the way they work
            through technology.
          </p>
        </Reveal>
        <Reveal variant="right" className="pb-tags">
          {TAGS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </Reveal>
      </div>
    </div>
  );
}