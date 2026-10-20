import { useState } from "react";
import Reveal from "@/components/pb/Reveal";
import { Link } from "react-router-dom";

const TEAM = [
  {
    name: "Deon Ncwane",
    role: "Chief Executive Officer",
    img: "/assets/media/deon-ncwane.png",
  },
  {
    name: "Pontsho",
    role: "Admin and Support",
    img: "/assets/media/pontsho.png",
  },
  {
    name: "Petronel Manzini",
    role: "HOD: Front-End Development",
    img: "/assets/media/petronel-manzini.jpg",
  },
  {
    name: "Xolani Hlatshwayo",
    role: "HOD: Back-End Development",
    img: "/assets/media/xolani-hlatshwayo.jpg",
  },
  {
    name: "David",
    role: "Call Centre Manager",
    img: "/assets/media/david.png",
  },
  {
    name: "Zama Madela",
    role: "Finance",
    img: "/assets/media/6028836e5_WhatsAppImage2026-10-06at095952.jpeg",
  },
];

function TeamPortrait({ member }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`pb-team-img${imageFailed ? " pb-team-img--fallback" : ""}`}>
      {imageFailed ? (
        <div role="img" aria-label={`${member.name} portrait unavailable`}>{initials}</div>
      ) : (
        <img
          src={member.img}
          alt={member.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

export default function Team() {
  return (
    <section className="pb-blk" style={{ paddingTop: 0 }}>
      <Reveal variant="up">
        <div className="pb-eyebrow">Meet our team</div>
        <h2 className="pb-h2">
          The people <em>behind the work</em>
        </h2>
      </Reveal>
      <div className="pb-team">
        {TEAM.map((m, i) => (
          <Reveal key={m.name} variant="up" delay={i * 110} className="pb-team-card">
            <Link to="/contact" className="pb-team-link" aria-label={`Contact us about ${m.name}`}>
              <TeamPortrait member={m} />
              <h3>{m.name}</h3>
              <span>{m.role}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}