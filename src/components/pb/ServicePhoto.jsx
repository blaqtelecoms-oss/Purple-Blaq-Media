const ASSET =
  "/assets/media/4143cb5f3_generated_52280b84.png";

const QUADRANTS = {
  "Workflow Systems": {
    pos: "0% 0%",
    alt: "Team collaborating on a workflow process diagram at a whiteboard",
  },
  "Web Applications": {
    pos: "100% 0%",
    alt: "Professional working in a custom web application dashboard at her desk",
  },
  "Process Digitisation": {
    pos: "100% 100%",
    alt: "Team reviewing paper documents alongside a tablet to digitise a process",
  },
};

export default function ServicePhoto({ service, className = "" }) {
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