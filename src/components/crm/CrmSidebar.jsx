import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCrm } from "@/lib/CrmContext";
import { listRecords } from "@/api/data";
import { useAuth } from "@/lib/AuthContext";
import { LOGO_URL } from "@/lib/pbConstants";
import { canAccess, initials } from "@/lib/crmConstants";

const ICONS = {
  dashboard: "M3 12 12 3l9 9M5 10v10h14V10",
  clients: "M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0",
  projects: "M3 7h18v13H3zM8 7V4h8v3",
  marketing: "M3 11l18-8-7 18-3-7-8-3zM9 15l5-5",
  team: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6",
  finance: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  support: "M4 5h16v11H9l-5 4z",
};

const NAV = [
  { route: "dashboard", label: "Dashboard", path: "/admin" },
  { route: "clients", label: "Clients", path: "/admin/clients" },
  { route: "projects", label: "Projects", path: "/admin/projects" },
  { route: "marketing", label: "Marketing", path: "/admin/marketing" },
  { route: "team", label: "Team", path: "/admin/team" },
  { route: "finance", label: "Finance", path: "/admin/finance" },
  { route: "support", label: "Support", path: "/admin/support" },
];

export default function CrmSidebar() {
  const { member } = useCrm();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [openCount, setOpenCount] = useState(0);

  const loadOpenCount = async () => {
    if (!canAccess(member?.role, "support")) return;
    try {
      const tickets = await listRecords("support_tickets", { filters: { status: "Open" } });
      setOpenCount(tickets.length);
    } catch (error) {
      console.error("Could not load the open ticket count:", error);
    }
  };

  useEffect(() => {
    loadOpenCount();
    const interval = setInterval(loadOpenCount, 15000);
    return () => clearInterval(interval);
  }, [member]);

  const handleLogout = () => {
    logout().then(() => navigate("/login")).catch((error) => {
      console.error("Sign-out failed:", error);
    });
  };

  const visibleNav = NAV.filter((n) => canAccess(member?.role, n.route));

  return (
    <aside className="crm-sidebar">
      <img src={LOGO_URL} alt="Purple Blaq Media" />
      <div className="crm-tag">ADMIN CRM</div>
      {visibleNav.map((n) => (
        <NavLink
          key={n.route}
          to={n.path}
          end={n.route === "dashboard"}
          className={({ isActive }) => `crm-nv ${isActive ? "on" : ""}`}
        >
          <svg viewBox="0 0 24 24">
            <path d={ICONS[n.route]} />
          </svg>
          {n.label}
          {n.route === "support" && openCount > 0 && (
            <i className="crm-badge">{openCount}</i>
          )}
        </NavLink>
      ))}
      <div className="crm-sidebar-bottom">
        <NavLink to="/" className="crm-nv crm-nv--link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to website
        </NavLink>
        <button className="crm-nv crm-nv--link" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Log out
        </button>
        <div className="crm-me">
          <div className="crm-av crm-av--r" style={{ background: "var(--p)", color: "#fff" }}>
            {initials(member?.full_name || member?.email || "U")}
          </div>
          <div>
            <b>{member?.full_name}</b>
            <small>{member?.role} · /admin</small>
          </div>
        </div>
      </div>
    </aside>
  );
}