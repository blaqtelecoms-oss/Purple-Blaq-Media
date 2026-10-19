import { Link } from "react-router-dom";
import { LOGO_URL, CONTACT, NAV_LINKS } from "@/lib/pbConstants";

export default function Footer() {
  return (
    <footer className="pb-footer">
      <div className="pb-f">
        <div>
          <img src={LOGO_URL} alt="Purple Blaq Media" />
          <br />
          Technology. Workflow. Digital Solutions.
        </div>
        <div>
          {CONTACT.location}
          <br />
          {CONTACT.phones.join(" | ")}
          <br />
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.path} to={l.path}>
              {l.label}
            </Link>
          ))}
        </div>
        <div>
          Web-based workflow systems
          <br />
          Business applications
          <br />
          Process automation
          <br />
          Digital solutions
        </div>
      </div>
      <div className="pb-bar" />
    </footer>
  );
}