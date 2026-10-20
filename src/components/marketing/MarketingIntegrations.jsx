import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { createRecord, updateRecord } from "@/api/data";
import { INTEGRATIONS, RESEND_CHECKLIST } from "@/lib/marketingConstants";

const GOOGLE_INTEGRATION_KEYS = ["google", "ga4", "gsc", "gcal", "gads", "drive"];

export default function MarketingIntegrations({ data, reload }) {
  const connections = data.integration_connections || [];
  const [busy, setBusy] = useState("");
  const [oauthMsg, setOauthMsg] = useState(null);

  const conn = (key) => connections.find((c) => c.key === key);
  const googleConn = conn("google");
  const googleConnected = googleConn?.status === "connected";

  // Check for OAuth redirect result (?google=connected|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("google");
    if (status === "connected") {
      setOauthMsg({ ok: true, text: "Google account connected successfully." });
    } else if (status === "error") {
      setOauthMsg({ ok: false, text: "Could not connect Google. Please try again." });
    }
    if (status) {
      params.delete("google");
      const qs = params.toString();
      window.history.replaceState({}, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }
  }, []);

  const toggle = async (integration) => {
    setBusy(integration.key);
    try {
      const existing = conn(integration.key);
      const isPhase1 = integration.phase === 1;
      const nextStatus = (existing?.status === "connected" || existing?.status === "needs_setup") ? "disconnected" : isPhase1 ? "connected" : "needs_setup";

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

  const connectGoogle = async () => {
    setBusy("google");
    setOauthMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const result = await res.json();
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        alert(result.error || "Could not start Google OAuth.");
      }
    } catch (err) {
      alert(err.message || "Could not connect Google.");
    } finally {
      setBusy("");
    }
  };

  const disconnectGoogle = async () => {
    setBusy("google");
    try {
      for (const key of GOOGLE_INTEGRATION_KEYS) {
        const existing = conn(key);
        if (existing) {
          await updateRecord("integration_connections", existing.id, {
            status: "disconnected",
            connected_at: null,
            source_data: {},
          });
        }
      }
      await reload();
    } catch (err) {
      alert(err.message || "Could not disconnect Google.");
    } finally {
      setBusy("");
    }
  };

  const resendConn = conn("resend");
  const websiteFormUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketing-form-webhook`;
  const whatsappWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  return (
    <>
      {oauthMsg && (
        <div className="crm-card" style={{ marginBottom: 18, borderColor: oauthMsg.ok ? "var(--ok)" : "var(--warn)" }}>
          <p style={{ margin: 0, color: oauthMsg.ok ? "var(--ok)" : "var(--warn)" }}>{oauthMsg.text}</p>
        </div>
      )}

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

      <div className="crm-card" style={{ marginBottom: 18 }}>
        <h3>WhatsApp webhook</h3>
        <p style={{ color: "var(--mut)", fontSize: 13, lineHeight: 1.6 }}>
          In Meta Business Manager, add this URL as your WhatsApp webhook. Incoming messages become leads with source "WhatsApp":
        </p>
        <code style={{ display: "block", background: "var(--bg)", padding: 12, borderRadius: 10, wordBreak: "break-all", fontSize: 13 }}>{whatsappWebhookUrl}</code>
        <p style={{ color: "var(--mut)", fontSize: 12, marginTop: 8 }}>Set the verify token to match WHATSAPP_VERIFY_TOKEN. Subscribe to the "messages" field.</p>
      </div>

      {/* Google OAuth — one connection enables GA4, GSC, Calendar, Ads and Drive */}
      <div className="crm-card" style={{ marginBottom: 18 }}>
        <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Google Workspace
          {googleConnected
            ? <span className="crm-pill ok">Connected</span>
            : <span className="crm-pill">Not connected</span>}
        </h3>
        <p style={{ color: "var(--mut)", fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
          Connect once with Google OAuth to enable Analytics 4, Search Console, Calendar, Ads and Drive. No service-account keys needed — you authorise access through your Google account.
        </p>
        {googleConnected && googleConn?.source_data?.connected_email && (
          <p style={{ color: "var(--mut)", fontSize: 12, margin: "0 0 8px" }}>
            Connected as {googleConn.source_data.connected_email}
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          {googleConnected ? (
            <button className="crm-b" disabled={busy === "google"} onClick={disconnectGoogle}>
              {busy === "google" ? "…" : "Disconnect Google"}
            </button>
          ) : (
            <button className="crm-b crm-b--g" disabled={busy === "google"} onClick={connectGoogle}>
              {busy === "google" ? "…" : "Connect with Google"}
            </button>
          )}
        </div>
        {!googleConnected && (
          <p style={{ color: "var(--warn)", fontSize: 11, marginTop: 8 }}>
            Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as secrets, then connect your Google account.
          </p>
        )}
      </div>

      <div className="crm-grid crm-k3">
        {INTEGRATIONS.map((i) => {
          const c = conn(i.key);
          const isGoogle = i.oauth === "google";
          const connected = isGoogle ? googleConnected : c?.status === "connected";
          const needsSetup = !isGoogle && c?.status === "needs_setup";
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
              {i.phase > 1 && !connected && !isGoogle && (
                <p style={{ color: "var(--warn)", fontSize: 11, marginTop: 8 }}>
                  Phase {i.phase} — needs credentials and app approval. {i.label.includes("Meta") || i.label.includes("LinkedIn") || i.label.includes("TikTok") ? "App review required." : "Ask for credentials."}
                </p>
              )}
              <div style={{ marginTop: 10 }}>
                {isGoogle ? (
                  <span style={{ color: "var(--mut)", fontSize: 12 }}>
                    {connected ? "Managed by Google connection above" : "Connect Google above to enable"}
                  </span>
                ) : (
                  <button className="crm-b crm-b--g" disabled={busy === i.key}
                    onClick={() => toggle(i)}>
                    {busy === i.key ? "…" : connected ? "Disconnect" : needsSetup ? "Mark needs setup" : "Connect"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
