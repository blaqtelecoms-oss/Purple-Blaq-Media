import Reveal from "@/components/pb/Reveal";

const HEADER_BG =
  "https://images.unsplash.com/photo-1573167627769-e201a7ddf409?auto=format&fit=crop&w=1600&q=80";

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