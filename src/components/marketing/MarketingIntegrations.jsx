import { useState } from "react";
import { createRecord, updateRecord } from "@/api/data";
import { INTEGRATIONS, RESEND_CHECKLIST } from "@/lib/marketingConstants";

export default function MarketingIntegrations({ data, reload }) {
  const connections = data.integration_connections || [];
  const [busy, setBusy] = useState("");

  const conn = (key) => connections.find((c) => c.key === key);

  const toggle = async (integration) => {
    setBusy(integration.key);
    try {
      const existing = conn(integration.key);
      const isPhase1 = integration.phase === 1;
      const nextStatus = existing?.status === "connected" ? "disconnected" : isPhase1 ? "connected" : "needs_setup";

      if (existing) {
        await updateRecord("integration_connections", existing.id, {
          status: nextStatus,
          connected_at: nextStatus === "connected" ? (existing.connected_at || new Date().toISOString()) : null,
          last_sync_at: nextStatus === "connected" ? new Date().toISOString() : existing.last_sync_at,
        });
      } else {
        await createRecord("integration_connections", {
          key: integration.key,
          status: nextStatus,
          account_label: integration.label,
          connected_at: nextStatus === "connected" ? new Date().toISOString() : null,
          last_sync_at: nextStatus === "connected" ? new Date().toISOString() : null,
        });
      }
      await reload();
    } catch (err) {
      alert(err.message || "Could not update the connection.");
    } finally {
      setBusy("");
    }
  };

  const resendConn = conn("resend");
  const websiteFormUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-form-webhook`;

  return (
    <>
      <div className="crm-card" style={{ marginBottom: 18 }}>
        <h3 style={{ display: "flex", justifyContent: "space-between" }}>
          Resend setup checklist
          <span className={`crm-pill ${resendConn?.status === "connected" ? "ok" : "warn"}`}>
            {resendConn?.status === "connected" ? "Active" : "Not connected"}
          </span>
        </h3>
        {RESEND_CHECKLIST.map((step, i) => (
          <div className="crm-row" key={i} style={{ padding: "10px 0", borderTop: i === 0 ? 0 : "1px solid var(--line)" }}>
            <div style={{ flex: 1 }}>{step}</div>
          </div>
        ))}
      </div>

      <div className="crm-card" style={{ marginBottom: 18 }}>
        <h3>Website form webhook</h3>
        <p style={{ color: "var(--mut)", fontSize: 13, lineHeight: 1.6 }}>
          Point your website form at this public endpoint. It creates a lead in stage New with source "Website form":
        </p>
        <code style={{ display: "block", background: "var(--bg)", padding: 12, borderRadius: 10, wordBreak: "break-all", fontSize: 13 }}>{websiteFormUrl}</code>
        <p style={{ color: "var(--mut)", fontSize: 12, marginTop: 8 }}>POST with JSON: name, email, phone, message, utm_source, utm_campaign.</p>
      </div>

      <div className="crm-grid crm-k3">
        {INTEGRATIONS.map((i) => {
          const c = conn(i.key);
          const connected = c?.status === "connected";
          const needsSetup = c?.status === "needs_setup";
          return (
            <div className="crm-card" key={i.key}>
              <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {i.label}
                {connected ? <span className="crm-pill ok">Connected</span>
                  : needsSetup ? <span className="crm-pill warn">Needs setup</span>
                  : <span className="crm-pill">Disconnected</span>}
              </h3>
              <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>{i.description}</p>
              <span className="crm-pill">Used in {i.usedIn}</span>
              {i.phase > 1 && !connected && (
                <p style={{ color: "var(--warn)", fontSize: 11, marginTop: 8 }}>
                  Phase {i.phase} — needs credentials and app approval. {i.label.includes("Meta") || i.label.includes("LinkedIn") || i.label.includes("TikTok") ? "App review required." : "Ask for credentials."}
                </p>
              )}
              <div style={{ marginTop: 10 }}>
                <button className="crm-b crm-b--g" disabled={busy === i.key}
                  onClick={() => toggle(i)}>
                  {busy === i.key ? "…" : connected ? "Disconnect" : needsSetup ? "Mark needs setup" : "Connect"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
