import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCrm } from "@/lib/CrmContext";
import { canAccess, formatZAR } from "@/lib/crmConstants";
import { useMarketingData } from "@/components/marketing/useMarketingData";
import MarketingOverview from "@/components/marketing/MarketingOverview";
import MarketingLeads from "@/components/marketing/MarketingLeads";
import MarketingCampaigns from "@/components/marketing/MarketingCampaigns";
import MarketingCalendar from "@/components/marketing/MarketingCalendar";
import MarketingSocial from "@/components/marketing/MarketingSocial";
import MarketingAssets from "@/components/marketing/MarketingAssets";
import MarketingEmail from "@/components/marketing/MarketingEmail";
import MarketingTasks from "@/components/marketing/MarketingTasks";
import MarketingTools from "@/components/marketing/MarketingTools";
import MarketingIntegrations from "@/components/marketing/MarketingIntegrations";

const TABS = [
  "Overview", "Leads", "Campaigns", "Calendar", "Social",
  "Assets", "Email", "Tasks", "Tools", "Integrations",
];

export default function Marketing() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const tab = rawTab.charAt(0).toUpperCase() + rawTab.slice(1);
  const { data, error, reload } = useMarketingData();

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "marketing")) {
      navigate("/admin", { replace: true });
    }
  }, [member, navigate]);

  const setTab = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === "Overview") params.delete("tab");
    else params.set("tab", next.toLowerCase());
    setSearchParams(params, { replace: true });
  };

  const exportReport = () => {
    if (!data) return;
    const leads = data.marketing_leads || [];
    const camps = data.campaigns || [];
    const won = leads.filter((l) => l.stage === "Won").length;
    const spend = camps.reduce((a, c) => a + (Number(c.spend) || 0), 0);
    const date = new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
    const lines = [
      `Marketing Hub monthly report — ${date}`,
      "",
      `New leads: ${leads.length}`,
      `Won (converted): ${won}`,
      `Lead-to-client rate: ${leads.length ? Math.round((won / leads.length) * 100) : 0}%`,
      `Total marketing spend: ${formatZAR(spend)}`,
      "",
      "Top campaigns:",
      ...camps
        .map((c) => ({
          name: c.name, spend: Number(c.spend) || 0, revenue: Number(c.revenue) || 0,
          roi: (Number(c.spend) > 0 ? Math.round(((Number(c.revenue) || 0) - Number(c.spend)) / Number(c.spend) * 100) : null),
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5)
        .map((c) => `  • ${c.name} — spend ${formatZAR(c.spend)}, revenue ${formatZAR(c.revenue)}, ROI ${c.roi === null ? "–" : c.roi + "%"}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing-report-${date.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (member && !canAccess(member.role, "marketing")) {
    return <div className="crm-empty" role="alert">This account does not have access to the Marketing Hub.</div>;
  }

  return (
    <>
      <div className="crm-top">
        <div>
          <h1>MARKETING <em>HUB</em></h1>
          <div className="crm-sub">Leads, campaigns and content in one place, linked to Clients and Finance.</div>
        </div>
        <button className="crm-b crm-b--g" onClick={exportReport} disabled={!data}>
          Export monthly report
        </button>
      </div>

      {error && <p role="alert" className="crm-field-err">{error}</p>}

      <div className="crm-chips" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? "on" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="crm-loading"><div className="crm-spinner" /></div>
      ) : (
        <>
          {tab === "Overview" && <MarketingOverview data={data} />}
          {tab === "Leads" && <MarketingLeads data={data} reload={reload} />}
          {tab === "Campaigns" && <MarketingCampaigns data={data} reload={reload} />}
          {tab === "Calendar" && <MarketingCalendar data={data} reload={reload} />}
          {tab === "Social" && <MarketingSocial data={data} reload={reload} />}
          {tab === "Assets" && <MarketingAssets data={data} reload={reload} />}
          {tab === "Email" && <MarketingEmail data={data} reload={reload} />}
          {tab === "Tasks" && <MarketingTasks data={data} reload={reload} />}
          {tab === "Tools" && <MarketingTools data={data} reload={reload} />}
          {tab === "Integrations" && <MarketingIntegrations data={data} reload={reload} />}
        </>
      )}
    </>
  );
}
