const IMAGES = {
  "Workflow Systems": {
    src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800&q=80",
    alt: "Monitoring screen displaying a live workflow dashboard with real-time data",
  },
  "Web Applications": {
    src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    alt: "MacBook screen showing lines of code for a custom web application",
  },
  "Process Digitisation": {
    src: "https://images.unsplash.com/photo-1528901166007-3784c7dd3653?auto=format&fit=crop&w=800&q=80",
    alt: "Black professionals working at computers managing a digitised process",
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