import { formatZAR } from "@/lib/crmConstants";
import { statusPillClass } from "@/lib/marketingConstants";

function StatCard({ label, value, sub, subClass }) {
  return (
    <div className="crm-card crm-card--h crm-kpi">
      <small>{label}</small>
      <b>{value}</b>
      <span className={subClass || ""}>{sub}</span>
    </div>
  );
}

export default function MarketingOverview({ data }) {
  const leads = data.marketing_leads || [];
  const camps = data.campaigns || [];
  const content = (data.content_items || []).filter((c) => c.publish_date);

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthLeads = leads.filter((l) => {
    const d = new Date(l.created_date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const lastMonthLeads = leads.filter((l) => {
    const d = new Date(l.created_date);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const won = leads.filter((l) => l.stage === "Won").length;
  const leadRate = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const spend = camps.reduce((a, c) => a + (Number(c.spend) || 0), 0);

  const monthBudget = (data.marketing_budgets || []).find((b) => {
    const d = new Date(b.month);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const budgetAmount = monthBudget ? Number(monthBudget.amount) || 0 : 0;
  const budgetPct = budgetAmount > 0 ? Math.min(100, Math.round((spend / budgetAmount) * 100)) : 0;

  const activeCamps = camps.filter((c) => c.status === "Active").length;
  const plannedCamps = camps.filter((c) => c.status === "Planned").length;

  const sources = {};
  leads.forEach((l) => { sources[l.source] = (sources[l.source] || 0) + 1; });
  const sourceEntries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const maxSource = sourceEntries.length ? sourceEntries[0][1] : 1;

  const upcoming = [...content]
    .filter((c) => new Date(c.publish_date) >= new Date(now.getFullYear(), now.getMonth(), 1))
    .sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))
    .slice(0, 5);

  const ga4 = (data.integration_connections || []).find((i) => i.key === "ga4" && i.status === "connected");
  const gsc = (data.integration_connections || []).find((i) => i.key === "gsc" && i.status === "connected");

  return (
    <>
      <div className="crm-grid crm-k4" style={{ marginBottom: 18 }}>
        <StatCard label="New leads (month)" value={monthLeads.length}
          sub={`${monthLeads.length - lastMonthLeads.length >= 0 ? "+" : ""}${monthLeads.length - lastMonthLeads.length} vs last month`}
          subClass={monthLeads.length >= lastMonthLeads.length ? "up" : "dn"} />
        <StatCard label="Lead → client rate" value={leadRate + "%"} sub={`${won} won`} subClass="up" />
        <StatCard label="Marketing spend" value={formatZAR(spend)}
          sub={budgetAmount ? `of ${formatZAR(budgetAmount)} budget` : "No budget set"} />
        <StatCard label="Active campaigns" value={activeCamps} sub={`${plannedCamps} planned`} subClass="up" />
      </div>

      <div className="crm-grid crm-k2" style={{ marginBottom: 18 }}>
        <div className="crm-card">
          <h3>Leads by source</h3>
          {sourceEntries.length === 0 ? (
            <div className="crm-empty">No leads yet. Add your first lead.</div>
          ) : sourceEntries.map(([k, v]) => (
            <div className="crm-row" key={k}>
              <div style={{ width: 120 }}>{k}</div>
              <div className="crm-prog" style={{ flex: 1 }}>
                <i style={{ width: `${(v / maxSource) * 100}%` }} />
              </div>
              <b style={{ width: 30, textAlign: "right" }}>{v}</b>
            </div>
          ))}
        </div>

        <div className="crm-card">
          <h3 style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
            Traffic and search
          </h3>
          {!ga4 && !gsc ? (
            <div className="crm-empty">
              Connect Google Analytics or Search Console on the Integrations tab to see live traffic and keywords.
            </div>
          ) : (
            <div className="crm-empty">
              {ga4 ? "GA4 connected — visit and page data will appear here once Phase 2 is complete." : "Connect GA4 for visit data."}
              <br />
              {gsc ? "Search Console connected — keyword data will appear here once Phase 2 is complete." : "Connect Search Console for keyword data."}
            </div>
          )}
        </div>
      </div>

      <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="crm-card">
          <h3>Campaign performance</h3>
          {camps.filter((c) => c.id && leads.some((l) => l.campaign_id === c.id)).length === 0 ? (
            <div className="crm-empty">No campaign leads yet.</div>
          ) : camps
            .map((c) => ({ ...c, leadCount: leads.filter((l) => l.campaign_id === c.id).length }))
            .filter((c) => c.leadCount > 0)
            .map((c) => (
              <div className="crm-row" key={c.id}>
                <div style={{ flex: 1 }}>
                  <b>{c.name}</b>
                  <div style={{ color: "var(--mut)", fontSize: 12 }}>{c.channel}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b>{c.leadCount} leads</b>
                  <div style={{ color: "var(--mut)", fontSize: 12 }}>
                    {c.leadCount ? formatZAR(Math.round((Number(c.spend) || 0) / c.leadCount)) : "—"} / lead
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="crm-card">
          <h3>Upcoming content</h3>
          {upcoming.length === 0 ? (
            <div className="crm-empty">No scheduled content. Add an item on the Calendar tab.</div>
          ) : upcoming.map((c) => (
            <div className="crm-row" key={c.id}>
              <div style={{ flex: 1 }}>
                <b>{c.title}</b>
                <div style={{ color: "var(--mut)", fontSize: 12 }}>
                  {c.platform} · {new Date(c.publish_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
                </div>
              </div>
              <span className={`crm-pill ${statusPillClass(c.status)}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
