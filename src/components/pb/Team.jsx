import Reveal from "@/components/pb/Reveal";

const TEAM = [
  {
    name: "Deon Ncwane",
    role: "Chief Executive Officer",
    img: "https://www.purpleblaq.co.za/images/1024%2C1254x1144%2B0%2B54/28106591/WhatsAppImage2026-09-17at15.50.31-_4_jkFcMhx_NSr26bWYRRg.jpeg",
  },
  {
    name: "Pontso",
    role: "Admin and Support",
    img: "https://www.purpleblaq.co.za/images/1024%2C1045x953%2B0%2B207/28106574/WhatsAppImage2026-09-17at15.49.35-NEZvaHJ7XHAu3Une6muneg.jpeg",
  },
  {
    name: "Petronel Manzini",
    role: "HOD: Front-End Development",
    img: "https://www.purpleblaq.co.za/images/1024%2C780x711%2B0%2B170/28106601/WhatsAppImage2026-09-17at15.48.20-8vAHHQkmHHXmbUt0gVMkeQ.jpeg",
  },
  {
    name: "Xolani Hlatshwayo",
    role: "HOD: Back-End Development",
    img: "https://www.purpleblaq.co.za/images/1024%2C640x584%2B0%2B28/28122200/126ebeb4-f85f-4b86-b985-2fe9529b8995-ZYO-jFNe_8MXYKxtssQf4A.jpg",
  },
  {
    name: "David",
    role: "Call Centre Manager",
    img: "https://www.purpleblaq.co.za/images/1024%2C1233x1122%2B84%2B0/28106593/WhatsAppImage2026-09-17at15.48.18-Cy3M0oY4lc_U3gIf5h-L-g.jpeg",
  },
  {
    name: "Zama Madela",
    role: "Finance",
    img: "https://media.base44.com/images/public/6ac499d8504167d4dac67bfa/6028836e5_WhatsAppImage2026-10-06at095952.jpeg",
  },
];

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
            <div className="pb-team-img">
              <img src={m.img} alt={m.name} loading="lazy" />
            </div>
            <h3>{m.name}</h3>
            <span>{m.role}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}