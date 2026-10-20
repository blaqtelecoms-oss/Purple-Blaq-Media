const PHOTOS = {
  "Workflow Systems": {
    src: "https://images.unsplash.com/photo-1612299273045-362a39972259?auto=format&fit=crop&w=800&q=80",
    alt: "Black professional using a MacBook to manage a workflow system",
  },
  "Web Applications": {
    src: "https://images.unsplash.com/photo-1739300293504-234817eead52?auto=format&fit=crop&w=800&q=80",
    alt: "Black woman working in a custom web application dashboard",
  },
  "Process Digitisation": {
    src: "https://images.unsplash.com/photo-1641760342353-f932d81fdbf1?auto=format&fit=crop&w=800&q=80",
    alt: "Black professionals reviewing documents to digitise a process",
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