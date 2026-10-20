import Reveal from "@/components/pb/Reveal";

const HEADER_BG =
  "/assets/media/5d7ba2cf2_generated_485b497a.png";

export default function PageHeader({ eyebrow, title, lead }) {
  // title may contain <em>...</em> markup; render with dangerouslySetInnerHTML
  return (
    <section className="pb-pagehead">
      <img
        className="pb-pagehead__bg"
        src={HEADER_BG}
        alt=""
        aria-hidden="true"
      />
      <div className="pb-pagehead__scrim" />
      <div className="pb-in">
        <Reveal>
          <div className="pb-eyebrow">{eyebrow}</div>
          <h1
            className="pb-h2"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {lead && <p className="pb-lead">{lead}</p>}
        </Reveal>
      </div>
    </section>
  );
}