export const ROLES = ["Admin", "Development", "Marketing", "Finance", "Support"];
export const PROJECT_TYPES = ["Website", "WebApp", "Workflow System", "Marketing", "Branding", "Other"];

export const ROUTE_ACCESS = {
  dashboard: ["Admin", "Finance", "Development", "Marketing", "Support"],
  clients: ["Admin", "Finance", "Development", "Marketing"],
  projects: ["Admin", "Finance", "Development", "Marketing"],
  marketing: ["Admin", "Marketing"],
  team: ["Admin"],
  finance: ["Admin", "Finance"],
  support: ["Admin", "Support"],
};

export const canAccess = (role, route) => ROUTE_ACCESS[route]?.includes(role);
export const canEditClients = (role) => ["Admin", "Marketing"].includes(role);
export const canEditProjects = (role) => ["Admin", "Development", "Marketing"].includes(role);
export const canManageTeam = (role) => role === "Admin";
export const canEditFinance = (role) => ["Admin", "Finance"].includes(role);
export const canManageSupport = (role) => ["Admin", "Support"].includes(role);

export const formatZAR = (n) => "R" + Math.round(n || 0).toLocaleString("en-ZA");

export const initials = (s) =>
  (s || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const projectProgress = (p) => {
  if (!p.tasks || !p.tasks.length) return 0;
  return Math.round(p.tasks.filter((t) => t.done).length / p.tasks.length * 100);
};

export const formatDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

export const formatTime = (d) => {
  if (!d) return "";
  try {
    const date = new Date(d);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
    return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};