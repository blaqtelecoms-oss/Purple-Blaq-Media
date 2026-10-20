import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";
import { listRecords } from "@/api/data";

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 28 days", days: 28 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function MarketingAnalytics() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [ga4Data, setGa4Data] = useState(null);
  const [gscData, setGscData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  // Google integrations are all driven by a single "google" OAuth connection.
  const googleConn = integrations.find((i) => i.key === "google" && i.status === "connected");
  const ga4 = googleConn;
  const gsc = googleConn;

  useEffect(() => {
    (async () => {
      try {
        const rows = await listRecords("integration_connections");
        setIntegrations(rows || []);
      } catch { setIntegrations([]); }
    })();
  }, []);

  const fetchAnalytics = useCallback(async (rangeDays) => {
    setLoading(true);
    setError("");
    setGa4Data(null);
    setGscData(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
      const url = import.meta.env.VITE_SUPABASE_URL;
      const tasks = [];
      if (ga4) tasks.push(
        fetch(`${url}/functions/v1/ga4-metrics`, { method: "POST", headers, body: JSON.stringify({ days: rangeDays }) })
          .then(async (r) => ({ ok: r.ok, data: await r.json() })).catch(() => null)
      );
      if (gsc) tasks.push(
        fetch(`${url}/functions/v1/gsc-keywords`, { method: "POST", headers, body: JSON.stringify({ days: rangeDays }) })
          .then(async (r) => ({ ok: r.ok, data: await r.json() })).catch(() => null)
      );
      const results = await Promise.all(tasks);
      const errs = [];
      let idx = 0;
      if (ga4) {
        const r = results[idx]; idx++;
        if (r?.ok && r.data?.ok) setGa4Data(r.data);
        else errs.push(r?.data?.error || "GA4 metrics request failed.");
      }
      if (gsc) {
        const r = results[idx];
        if (r?.ok && r.data?.ok) setGscData(r.data);
        else errs.push(r?.data?.error || "Search Console request failed.");
      }
      if (errs.length) setError(errs.join(" "));
    } catch (err) {
      setError(err.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [ga4, gsc]);

  useEffect(() => {
    if (integrations.length === 0) return;
    fetchAnalytics(days);
  }, [integrations, days, fetchAnalytics]);

  return (
    <>
      <div className="crm-top">
        <div>
          <h1>MARKETING <em>ANALYTICS</em></h1>
          <div className="crm-sub">Detailed traffic and search performance from Google Analytics & Search Console.</div>
        </div>
        <button className="crm-b" onClick={() => navigate("/admin/marketing?tab=overview")}>
          ← Back to Overview
        </button>
      </div>

      <div className="crm-chips" style={{ marginBottom: 20 }}>
        {RANGES.map((r) => (
          <button key={r.days} className={days === r.days ? "on" : ""} onClick={() => setDays(r.days)}>
            {r.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="crm-field-err">{error}</p>}

      {!googleConn && !loading && (
        <div className="crm-empty">
          Connect Google Analytics or Search Console on the Integrations tab to see analytics data.
        </div>
      )}

      {loading && <div className="crm-loading"><div className="crm-spinner" /></div>}

      {!loading && googleConn && !ga4Data && !gscData && !error && (
        <div className="crm-empty">No data returned. Check that your Google integrations are authorised.</div>
      )}

      {!loading && (ga4Data || gscData) && (
        <>
          {ga4Data && (
            <div className="crm-card" style={{ marginBottom: 18 }}>
              <h3>Google Analytics 4 — {ga4Data.dateRange?.start} to {ga4Data.dateRange?.end}</h3>
              <div className="crm-grid crm-k4" style={{ marginBottom: 16 }}>
                <div className="crm-card crm-card--h crm-kpi"><small>Visitors</small><b>{ga4Data.totals.visitors}</b></div>
                <div className="crm-card crm-card--h crm-kpi"><small>Sessions</small><b>{ga4Data.totals.sessions}</b></div>
                <div className="crm-card crm-card--h crm-kpi"><small>Page views</small><b>{ga4Data.totals.pageViews}</b></div>
                <div className="crm-card crm-card--h crm-kpi">
                  <small>Avg session</small>
                  <b>{Math.round(ga4Data.totals.avgSessionDuration / 60)}m {ga4Data.totals.avgSessionDuration % 60}s</b>
                </div>
              </div>

              <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <h4 style={{ fontSize: 14, marginBottom: 8 }}>Top pages ({ga4Data.topPages?.length || 0})</h4>
                  {ga4Data.topPages?.length > 0 ? (
                    <table className="crm-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Page</th><th>Views</th><th>Visitors</th></tr></thead>
                      <tbody>
                        {ga4Data.topPages.map((p) => (
                          <tr key={p.path}>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{p.path}</td>
                            <td style={{ textAlign: "right" }}>{p.views}</td>
                            <td style={{ textAlign: "right" }}>{p.visitors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="crm-empty">No page data.</div>}
                </div>

                <div>
                  <h4 style={{ fontSize: 14, marginBottom: 8 }}>Traffic sources ({ga4Data.topSources?.length || 0})</h4>
                  {ga4Data.topSources?.length > 0 ? (
                    <table className="crm-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Source</th><th>Visitors</th><th>Sessions</th></tr></thead>
                      <tbody>
                        {ga4Data.topSources.map((s) => (
                          <tr key={s.medium}>
                            <td>{s.medium}</td>
                            <td style={{ textAlign: "right" }}>{s.visitors}</td>
                            <td style={{ textAlign: "right" }}>{s.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="crm-empty">No source data.</div>}
                </div>
              </div>
            </div>
          )}

          {gscData && (
            <div className="crm-card" style={{ marginBottom: 18 }}>
              <h3>Google Search Console — {gscData.dateRange?.start} to {gscData.dateRange?.end}</h3>
              <div className="crm-grid crm-k3" style={{ marginBottom: 16 }}>
                <div className="crm-card crm-card--h crm-kpi"><small>Clicks</small><b>{gscData.totals.clicks}</b></div>
                <div className="crm-card crm-card--h crm-kpi"><small>Impressions</small><b>{gscData.totals.impressions}</b></div>
                <div className="crm-card crm-card--h crm-kpi"><small>Avg position</small><b>{gscData.totals.avgPosition}</b></div>
              </div>

              <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <h4 style={{ fontSize: 14, marginBottom: 8 }}>Top keywords ({gscData.topKeywords?.length || 0})</h4>
                  {gscData.topKeywords?.length > 0 ? (
                    <table className="crm-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Keyword</th><th>Clicks</th><th>Impr.</th><th>CTR</th><th>Pos</th></tr></thead>
                      <tbody>
                        {gscData.topKeywords.map((k, i) => (
                          <tr key={i}>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{k.keyword?.[0]}</td>
                            <td style={{ textAlign: "right" }}>{k.clicks}</td>
                            <td style={{ textAlign: "right" }}>{k.impressions}</td>
                            <td style={{ textAlign: "right" }}>{k.ctr}%</td>
                            <td style={{ textAlign: "right" }}>{k.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="crm-empty">No keyword data.</div>}
                </div>

                <div>
                  <h4 style={{ fontSize: 14, marginBottom: 8 }}>Top pages ({gscData.topPages?.length || 0})</h4>
                  {gscData.topPages?.length > 0 ? (
                    <table className="crm-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead><tr><th style={{ textAlign: "left" }}>Page</th><th>Clicks</th><th>Impr.</th><th>Pos</th></tr></thead>
                      <tbody>
                        {gscData.topPages.map((p, i) => (
                          <tr key={i}>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{p.page?.[0]}</td>
                            <td style={{ textAlign: "right" }}>{p.clicks}</td>
                            <td style={{ textAlign: "right" }}>{p.impressions}</td>
                            <td style={{ textAlign: "right" }}>{p.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="crm-empty">No page data.</div>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
