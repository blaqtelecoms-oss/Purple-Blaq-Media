const IMAGES = {
  "Workflow Systems": {
    src: "https://images.unsplash.com/photo-1739298061707-cefee19941b7?auto=format&fit=crop&w=800&q=80",
    alt: "Black professionals collaborating around a table on a workflow system",
  },
  "Web Applications": {
    src: "https://images.unsplash.com/photo-1654022089753-064327fe4b1a?auto=format&fit=crop&w=800&q=80",
    alt: "Black developer working on a multi-device web application",
  },
  "Process Digitisation": {
    src: "https://images.unsplash.com/photo-1641760152630-07d889166174?auto=format&fit=crop&w=800&q=80",
    alt: "Black professional managing the digitisation of documents into a digital system",
  },
};

export default function ServiceIllustration({ service, className = "" }) {
  const q = IMAGES[service];
  if (!q) return null;
  return (
    <div
      role="img"
      aria-label={q.alt}
      className={`pb-svc-ill ${className}`}
      style={{ backgroundImage: `url(${q.src})`, backgroundSize: "cover", backgroundPosition: "center" }}
    />
  );
}