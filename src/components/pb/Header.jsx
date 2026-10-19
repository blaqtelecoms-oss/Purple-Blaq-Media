import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LOGO_URL, NAV_LINKS } from "@/lib/pbConstants";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="pb-nav">
      <Link to="/" aria-label="Purple Blaq Media home">
        <img src={LOGO_URL} alt="Purple Blaq Media" />
      </Link>

      <nav className="pb-nav-links">
        {NAV_LINKS.map((l) => (
          <NavLink
            key={l.path}
            to={l.path}
            end={l.path === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link to="/contact" className="pb-btn pb-nav-cta" style={{ whiteSpace: "nowrap" }}>
          Get in touch
        </Link>
        <button
          className="pb-burger"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={28} />
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            padding: "20px 5vw",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link to="/" onClick={() => setOpen(false)}>
              <img src={LOGO_URL} alt="Purple Blaq Media" style={{ height: 46 }} />
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <X size={28} />
            </button>
          </div>
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 36,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.path}
                to={l.path}
                end={l.path === "/"}
                onClick={() => setOpen(false)}
                style={({ isActive }) =>
                  isActive ? { color: "var(--p)" } : { color: "var(--ink)" }
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/contact"
            className="pb-btn"
            onClick={() => setOpen(false)}
            style={{ marginTop: 32, alignSelf: "flex-start" }}
          >
            Get in touch
          </Link>
        </div>
      )}
    </header>
  );
}