import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { updateRecord, createRecord } from "@/api/data";
import { formatTime } from "@/lib/crmConstants";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";

const SALES_FROM = "Purple Blaq Sales <sales@purpleblaq.co.za>";

export default function MarketingEmail({ data, reload }) {
  const messages = data.email_messages || [];
  const campaigns = data.email_campaigns || [];
  const integrations = data.integration_connections || [];
  const [folder, setFolder] = useState("Inbox");
  const [selected, setSelected] = useState(0);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ to: "", subject: "", text: "", in_reply_to: "" });
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const resendConnected = integrations.some((i) => i.key === "resend" && i.status === "connected");
  const lastSync = integrations.find((i) => i.key === "resend")?.last_sync_at;

  const inbox = messages.filter((m) => m.direction === "inbound").sort((a, b) =>
    new Date(b.received_or_sent_at || b.created_date) - new Date(a.received_or_sent_at || a.created_date));
  const sent = messages.filter((m) => m.direction === "outbound").sort((a, b) =>
    new Date(b.received_or_sent_at || b.created_date) - new Date(a.received_or_sent_at || a.created_date));
  const list = folder === "Inbox" ? inbox : sent;
  const current = list[selected] || list[0];
  const unread = inbox.filter((m) => !m.is_read).length;

  // Lightweight polling for new mail.
  useEffect(() => {
    const id = setInterval(() => { if (resendConnected) reload(); }, 20000);
    return () => clearInterval(id);
  }, [resendConnected, reload]);

  const openMessage = async (m, idx) => {
    setSelected(idx);
    if (folder === "Inbox" && m && !m.is_read) {
      try { await updateRecord("email_messages", m.id, { is_read: true }); await reload(); } catch {}
    }
  };

  const reply = () => {
    if (!current) return;
    const fromMatch = (current.from_email || "").match(/<(.+)>/) || [null, current.from_email];
    setDraft({ to: fromMatch[1] || current.from_email || "", subject: "Re: " + (current.subject || "").replace(/^Re:\s*/, ""), text: "", in_reply_to: current.id });
    setComposing(true);
  };

  const send = async () => {
    if (!draft.to.includes("@")) { setError("Enter a valid recipient."); return; }
    if (!draft.subject.trim()) { setError("Add a subject."); return; }
    setSending(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-marketing-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({
            to: draft.to, subject: draft.subject, text: draft.text,
            in_reply_to: draft.in_reply_to || null,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Send failed.");
      setComposing(false);
      setDraft({ to: "", subject: "", text: "", in_reply_to: "" });
      setFolder("Sent");
      setSelected(0);
      await reload();
    } catch (err) {
      setError(err.message || "Could not send the email. Your draft is kept.");
    } finally {
      setSending(false);
    }
  };

  const syncInbox = async () => {
    setSyncing(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-inbox`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed.");
      await reload();
      alert(result.message || "Inbox synced.");
    } catch (err) {
      setError(err.message || "Could not sync the inbox.");
    } finally {
      setSyncing(false);
    }
  };

  if (!resendConnected) {
    return (
      <div className="crm-card">
        <h3>Email</h3>
        <div className="crm-empty">
          Connect Resend on the Integrations tab to send and receive as sales@purpleblaq.co.za.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="crm-grid crm-k4" style={{ marginBottom: 18 }}>
        <div className="crm-card crm-kpi"><small>Subscribers</small><b>{campaigns.reduce((a, c) => a + (Number(c.list_size) || 0), 0) || 0}</b><span>Total across campaigns</span></div>
        <div className="crm-card crm-kpi"><small>Avg open rate</small><b>{campaigns.length ? Math.round(campaigns.reduce((a, c) => a + (Number(c.open_rate) || 0), 0) / campaigns.length) + "%" : "—"}</b><span>Across sent campaigns</span></div>
        <div className="crm-card crm-kpi"><small>Avg click rate</small><b>{campaigns.length ? (campaigns.reduce((a, c) => a + (Number(c.click_rate) || 0), 0) / campaigns.length).toFixed(1) + "%" : "—"}</b><span>Across sent campaigns</span></div>
        <div className="crm-card crm-kpi"><small>Campaigns sent</small><b>{campaigns.filter((c) => c.status === "Sent").length}</b><span>{campaigns.filter((c) => c.status !== "Sent").length} drafted</span></div>
      </div>

      <div className="crm-top" style={{ marginBottom: 14 }}>
        <div>
          <span className="crm-pill ok">Resend connected</span>{" "}
          <span style={{ color: "var(--mut)", fontSize: 13 }}>sales@purpleblaq.co.za · {unread} unread · synced {lastSync ? formatTime(lastSync) : "never"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="crm-b crm-b--g" onClick={syncInbox} disabled={syncing}>{syncing ? "Syncing…" : "Sync inbox"}</button>
          <button className="crm-b" onClick={() => { setDraft({ to: "", subject: "", text: "", in_reply_to: "" }); setComposing(true); }}>Compose</button>
        </div>
      </div>
      {error && <p role="alert" className="crm-field-err" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="crm-card">
          <h3 style={{ display: "flex", gap: 6 }}>
            {["Inbox", "Sent"].map((f) => (
              <button key={f} className={`crm-pill ${folder === f ? "" : ""}`} style={folder === f ? { background: "var(--p)", color: "#fff" } : {}}
                onClick={() => { setFolder(f); setSelected(0); }}>{f}</button>
            ))}
          </h3>
          {list.length === 0 ? (
            <div className="crm-empty">{folder === "Inbox" ? "No messages in your inbox." : "No sent messages yet."}</div>
          ) : list.map((m, i) => (
            <div key={m.id} onClick={() => openMessage(m, i)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? 0 : "1px solid var(--line)", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{folder === "Inbox" && !m.is_read ? "● " : ""}{(folder === "Inbox" ? m.from_email : m.to_email) || "—"}</b>
                <div style={{ color: "var(--mut)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject || "(no subject)"}</div>
              </div>
              <span style={{ color: "var(--mut)", fontSize: 12 }}>{m.received_or_sent_at ? formatTime(m.received_or_sent_at) : ""}</span>
            </div>
          ))}
        </div>

        <div className="crm-card">
          {current ? (
            <>
              <h3 style={{ display: "flex", justifyContent: "space-between" }}>
                {current.subject || "(no subject)"}
                {folder === "Inbox" && <button className="crm-b" onClick={reply}>Reply</button>}
              </h3>
              <p style={{ color: "var(--mut)", fontSize: 13 }}>
                {folder === "Inbox" ? `From ${current.from_email}` : `To ${current.to_email}`} · {current.received_or_sent_at ? formatTime(current.received_or_sent_at) : ""}
              </p>
              {current.lead_id && <span className="crm-pill" style={{ marginTop: 8 }}>Linked to a lead</span>}
              <p style={{ marginTop: 14, lineHeight: 1.6 }}>{current.text || current.html || "No message body."}</p>
              {current.attachments && current.attachments.length > 0 && (
                <p style={{ color: "var(--mut)", fontSize: 13 }}>{current.attachments.length} attachment(s)</p>
              )}
            </>
          ) : (
            <div className="crm-empty">Select a message to read.</div>
          )}
        </div>
      </div>

      {composing && (
        <Modal title="New message" onClose={() => setComposing(false)} onSave={send} saving={sending} saveLabel="Send">
          <div className="crm-sub" style={{ marginBottom: 10 }}>From {SALES_FROM}</div>
          <ModalField label="To" required><input className={inputClass} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></ModalField>
          <ModalField label="Subject" required><input className={inputClass} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></ModalField>
          <ModalField label="Message"><textarea className={inputClass} rows={6} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} /></ModalField>
        </Modal>
      )}
    </>
  );
}
