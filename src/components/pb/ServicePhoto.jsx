const PHOTOS = {
  "Workflow Systems": {
    src: "https://images.unsplash.com/photo-1686061593213-98dad7c599b9?auto=format&fit=crop&w=800&q=80",
    alt: "Computer screen showing workflow data and charts in a centralised system",
  },
  "Web Applications": {
    src: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80",
    alt: "Monitor displaying programming code for a custom web application",
  },
  "Process Digitisation": {
    src: "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80",
    alt: "Monitor displaying a digital product interface for a digitised business process",
  },
};

export default function ServicePhoto({ service, className = "" }) {
  const q = PHOTOS[service];
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