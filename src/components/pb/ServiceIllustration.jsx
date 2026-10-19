const ASSET =
  "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/ba9eb53bb_generated_d35b85b8.png";

const QUADRANTS = {
  "Workflow Systems": {
    pos: "0% 0%",
    alt: "Isometric illustration of a workflow automation conveyor with gears, documents and two professionals interacting with devices",
  },
  "Web Applications": {
    pos: "100% 0%",
    alt: "Isometric illustration of a multi-device web application dashboard across desktop monitor, laptop, tablet and smartphone",
  },
  "Process Digitisation": {
    pos: "100% 100%",
    alt: "Isometric illustration of paper documents being processed into a cloud database system",
  },
};

export default function ServiceIllustration({ service, className = "" }) {
  const q = QUADRANTS[service];
  if (!q) return null;
  return (
    <div
      role="img"
      aria-label={q.alt}
      className={`pb-svc-ill ${className}`}
      style={{ backgroundImage: `url(${ASSET})`, backgroundPosition: q.pos }}
    />
  );
}