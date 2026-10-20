import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listRecords } from "@/api/data";
import { useCrm } from "@/lib/CrmContext";
import { formatZAR, projectProgress, initials, formatDate, canAccess } from "@/lib/crmConstants";
import CrmPageHeader from "@/components/crm/CrmPageHeader";

export default function Dashboard() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const [clients, tx, projects, tickets] = await Promise.all([
        canAccess(member.role, "clients") ? listRecords("clients") : [],
        canAccess(member.role, "finance") ? listRecords("transactions") : [],
        canAccess(member.role, "projects") ? listRecords("projects") : [],
        canAccess(member.role, "support")
          ? listRecords("support_tickets", { orderBy: "created_date", ascending: false, limit: 10 })
          : [],
      ]);
      setData({ clients, tx, projects, tickets });
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "dashboard")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  if (loading) return <div className="crm-loading"><div className="crm-spinner" /></div>;
  if (!data) return <div className="crm-empty" role="alert">{loadError || "Unable to load dashboard."}</div>;

  const canViewClients = canAccess(member?.role, "clients");
  const canViewFinance = canAccess(member?.role, "finance");
  const canViewProjects = canAccess(member?.role, "projects");
  const canViewSupport = canAccess(member?.role, "support");
  const inc = data.tx.filter((t) => t.type === "in" && t.status === "Paid");
  const rev = inc.reduce((a, t) => a + t.amount, 0);
  const exp = data.tx.filter((t) => t.type === "out" && t.status === "Paid").reduce((a, t) => a + t.amount, 0);
  const out = data.tx.filter((t) => t.type === "in" && t.status === "Pending").reduce((a, t) => a + t.amount, 0);
  const active = data.projects.filter((p) => projectProgress(p) < 100).length;
  const done = data.projects.filter((p) => projectProgress(p) === 100).length;
  const openTickets = data.tickets.filter((t) => t.status === "Open").length;

  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const now = new Date();
  const monthData = months.map((_, i) => {
    const m = (now.getMonth() - (5 - i) + 12) % 12;
    return inc.filter((t) => new Date(t.date).getMonth() === m).reduce((a, t) => a + t.amount, 0);
  });
  const mx = Math.max(...monthData, 1);

  const pc = data.projects.length ? Math.round((done / data.projects.length) * 100) : 0;

  return (
    <>
      <CrmPageHeader title="Business" em="overview" />
      <div className="crm-grid crm-k4">
        {canViewClients && <Kpi label="Total clients" value={data.clients.length} sub="+1 this quarter" cls="up" />}
        {canViewFinance && <Kpi label="Revenue (paid)" value={formatZAR(rev)} sub={"Expenses " + formatZAR(exp)} cls="" />}
        {canViewFinance && <Kpi label="Outstanding invoices" value={formatZAR(out)} sub="Awaiting payment" cls="dn" />}
        {canViewProjects && <Kpi label="Active projects" value={active} sub={done + " completed"} cls="up" />}
      </div>

      <div className="crm-grid crm-k2" style={{ marginTop: 18 }}>
        {canViewFinance && <div className="crm-card">
          <h3>Revenue, last 6 months</h3>
          <div className="crm-bars">
            {monthData.map((v, i) => (
              <div key={i} title={formatZAR(v)}>
                <i style={{ height: (v / mx) * 150 + "px" }} />
                {months[i]}
              </div>
            ))}
          </div>
        </div>}
        {canViewProjects && <div className="crm-card">
          <h3>Project delivery</h3>
          <div className="crm-row">
            <div className="crm-ring" style={{ background: `conic-gradient(var(--p) ${pc * 3.6}deg, var(--soft) 0)` }}>
              <b>{pc}%</b>
            </div>
            <div>
              {data.projects.slice(0, 4).map((p) => (
                <div key={p.id} style={{ fontSize: 12, margin: "4px 0" }}>
                  {p.name}
                  <div className="crm-prog" style={{ width: 150 }}>
                    <i style={{ width: projectProgress(p) + "%" }} />
                  </div>
                </div>
              ))}
              {data.projects.length === 0 && <small style={{ color: "var(--mut)" }}>No projects yet</small>}
            </div>
          </div>
        </div>}
      </div>

      <div className="crm-grid crm-k2" style={{ marginTop: 18 }}>
        {canViewFinance && <div className="crm-card">
          <h3>Latest transactions</h3>
          {data.tx.length === 0 ? (
            <small style={{ color: "var(--mut)" }}>No transactions yet</small>
          ) : (
            <div className="crm-sc">
              <table>
                <tbody>
                  {data.tx.slice(-5).reverse().map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.description}
                        <br />
                        <small style={{ color: "var(--mut)" }}>{formatDate(t.date)}</small>
                      </td>
                      <td>
                        <span className={`crm-pill ${t.status === "Paid" ? "ok" : "warn"}`}>{t.status}</span>
                      </td>
                      <td className="crm-r">
                        <b className={t.type === "in" ? "up" : "dn"}>
                          {t.type === "in" ? "+" : "-"}
                          {formatZAR(t.amount)}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>}
        {canViewSupport && <div className="crm-card">
          <h3>
            Support inbox <span className="crm-pill crm-pill--bad">{openTickets} open</span>
          </h3>
          {data.tickets.length === 0 ? (
            <small style={{ color: "var(--mut)" }}>No tickets yet</small>
          ) : (
            data.tickets.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="crm-row crm-tk"
                onClick={() => navigate("/admin/support")}
                style={{ cursor: "pointer" }}
              >
                <div className="crm-av">{initials(t.sender_name)}</div>
                <div>
                  <b>{t.subject}</b>
                  <br />
                  <small style={{ color: "var(--mut)" }}>{t.sender_name}</small>
                </div>
              </div>
            ))
          )}
        </div>}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, cls }) {
  return (
    <div className="crm-card crm-card--h crm-kpi">
      <small>{label}</small>
      <b>{value}</b>
      <span className={cls}>{sub}</span>
    </div>
  );
}