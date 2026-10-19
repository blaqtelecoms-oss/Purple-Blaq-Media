import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCrm } from "@/lib/CrmContext";
import { initials, formatTime, canAccess, canManageSupport } from "@/lib/crmConstants";
import CrmPageHeader from "@/components/crm/CrmPageHeader";

export default function Support() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState(null);
  const [team, setTeam] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");
  const replyRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, tm] = await Promise.all([
        base44.entities.SupportTicket.list("-created_date"),
        base44.entities.TeamMember.list(),
      ]);
      setTickets(t);
      setTeam(tm);
      if (t.length && !selectedId) setSelectedId(t[0].id);
    } catch {
      setTickets([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "support")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canManage = canManageSupport(member?.role);
  const ticket = tickets?.find((t) => t.id === selectedId);
  const assignable = team.filter((m) => m.role === "Support" || m.role === "Admin");

  const sendReply = async () => {
    const v = reply.trim();
    if (!v || !ticket) return;
    try {
      const messages = [...(ticket.messages || []), { from: "team", text: v, timestamp: new Date().toISOString() }];
      await base44.entities.SupportTicket.update(ticket.id, { messages });
      setReply("");
      await load();
    } catch {
      /* ignore */
    }
  };

  const assignTicket = async (assigneeId) => {
    if (!ticket) return;
    try {
      await base44.entities.SupportTicket.update(ticket.id, { assigned_to_id: assigneeId || "" });
      await load();
    } catch {
      /* ignore */
    }
  };

  const toggleStatus = async () => {
    if (!ticket) return;
    try {
      await base44.entities.SupportTicket.update(ticket.id, {
        status: ticket.status === "Open" ? "Resolved" : "Open",
      });
      await load();
    } catch {
      /* ignore */
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrateMsg("");
    try {
      const res = await base44.functions.invoke("migrateEnquiries", {});
      setMigrateMsg(`Migrated ${res.data?.migrated || 0} of ${res.data?.total || 0} enquiries.`);
      await load();
    } catch (err) {
      setMigrateMsg("Migration failed: " + (err.message || "error"));
    } finally {
      setMigrating(false);
    }
  };

  if (tickets === null) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  return (
    <>
      <CrmPageHeader title="Support" em="inbox" />
      {tickets.length === 0 ? (
        <>
          <div className="crm-empty">No support tickets yet. New contact form submissions will appear here.</div>
          <button className="crm-b crm-b--g" onClick={runMigration} disabled={migrating} style={{ marginTop: 14 }}>
            {migrating ? "Migrating…" : "Migrate existing enquiries"}
          </button>
          {migrateMsg && <p style={{ color: "var(--mut)", marginTop: 10 }}>{migrateMsg}</p>}
        </>
      ) : (
        <div className="crm-sup">
          <div className="crm-card" style={{ padding: 10 }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                className={`crm-tk ${t.id === selectedId ? "on" : ""}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="crm-row crm-sp">
                  <b>{t.subject}</b>
                  <span className={`crm-pill ${t.status === "Open" ? "warn" : "ok"}`}>{t.status}</span>
                </div>
                <small style={{ color: "var(--mut)" }}>
                  {t.sender_name} · {t.messages?.length ? formatTime(t.messages[t.messages.length - 1].timestamp) : ""}
                </small>
              </div>
            ))}
          </div>

          {ticket && (
            <div className="crm-card">
              <div className="crm-row crm-sp">
                <div>
                  <h3 style={{ margin: 0 }}>{ticket.subject}</h3>
                  <small style={{ color: "var(--mut)" }}>
                    {ticket.sender_name} · {ticket.sender_email} · via website contact form
                  </small>
                </div>
                {canManage && (
                  <div className="crm-row">
                    <select
                      className="crm-role-select"
                      value={ticket.assigned_to_id || ""}
                      onChange={(e) => assignTicket(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {assignable.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                    <button className="crm-b crm-b--g" onClick={toggleStatus}>
                      {ticket.status === "Open" ? "Resolve" : "Reopen"}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                {ticket.messages?.map((m, i) => (
                  <div key={i} className={`crm-bub ${m.from === "team" ? "t" : ""}`}>
                    {m.text}
                    <br />
                    <small style={{ opacity: 0.7 }}>{formatTime(m.timestamp)}</small>
                  </div>
                ))}
              </div>
              {canManage && (
                <div className="crm-rp">
                  <input
                    ref={replyRef}
                    placeholder="Write a reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  />
                  <button className="crm-b" onClick={sendReply}>Send</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}