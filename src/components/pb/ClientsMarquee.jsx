import Reveal from "@/components/pb/Reveal";

const LOGOS = [
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/0e5e734eb_70fe9367-124f-423d-8917-001d500212c8.jpg", alt: "Lunathi Restaurant" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/3f1e9e75a_9d008c19-ea83-4037-b52b-0b10a3973c8c.jpg", alt: "Inkomo Cover Plan" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/9ae8a7c20_fab77c211_KMLogo.png", alt: "Koos & Mike Cars" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/2a6b8e214_205c66c6-5482-4f01-b944-c97234fb4f80.jpg", alt: "Steam Room" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/3a1aaf760_salon_logo-removebg-preview.png", alt: "Ellens Beauty Spa" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/582a04d6b_aca533eb1_jtg-logo.png", alt: "Justice The Great" },
  { src: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/0342305ea_ayanda-msweli-tv-logo-CfaIokbf.jpeg", alt: "Ayanda Msweli TV" },
];

export default function ClientsMarquee() {
  return (
    <section className="pb-blk pb-clients">
      <Reveal>
        <div className="pb-eyebrow">Our clients</div>
        <h2 className="pb-h2">
          Trusted by <em>growing businesses</em>
        </h2>
        <p className="pb-lead">
          From hospitality to cover plans, motor trade to beauty — organisations
          across South Africa rely on Purple Blaq Media.
        </p>
      </Reveal>
      <div className="pb-marquee" aria-label="Our clients">
        <div className="pb-marquee__track">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div className="pb-marquee__item" key={i} aria-hidden={i >= LOGOS.length}>
              <img src={logo.src} alt={i < LOGOS.length ? logo.alt : ""} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}