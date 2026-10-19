import Reveal from "@/components/pb/Reveal";

export default function Story() {
  return (
    <section className="pb-blk" style={{ paddingTop: 80 }}>
      <Reveal variant="up">
        <div className="pb-eyebrow">Who we are</div>
        <h2 className="pb-h2">
          A South African <em>technology partner</em>
        </h2>
      </Reveal>

      <div className="pb-story-grid" style={{ marginTop: 36 }}>
        <Reveal variant="left" delay={80}>
          <p className="pb-lead" style={{ marginTop: 0 }}>
            Purple Blaq Media is a South African digital technology and business
            solutions company focused on helping organisations improve the way
            they work through technology.
          </p>
          <p className="pb-lead">
            We design, develop, implement and support web-based workflow systems
            and business applications that help organisations move away from
            manual processes, disconnected spreadsheets, paperwork and
            inefficient communication.
          </p>
        </Reveal>

        <Reveal variant="right" delay={160}>
          <p className="pb-lead" style={{ marginTop: 0 }}>
            Purple Blaq Media operates as a technology and consulting division of
            Blaq Duty Media, combining business consulting experience with modern
            digital development capabilities. Our approach is simple:
          </p>
          <div className="pb-approach-flow">
            <span>Understand</span>
            <i>→</i>
            <span>Map</span>
            <i>→</i>
            <span>Build</span>
            <i>→</i>
            <span>Implement</span>
            <i>→</i>
            <span>Support</span>
            <i>→</i>
            <span>Improve</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}