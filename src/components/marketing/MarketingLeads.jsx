import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { createRecord, updateRecord, listRecords } from "@/api/data";
import { formatZAR, initials } from "@/lib/crmConstants";
import { LEAD_STAGES, LEAD_SOURCES } from "@/lib/marketingConstants";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";
import Drawer from "@/components/marketing/Drawer";

const emptyForm = {
  name: "", company: "", email: "", phone: "", source: "Website form",
  stage: "New", value: 0, campaign_id: "", owner: "", notes: "",
  utm_source: "", utm_campaign: "",
};

export default function MarketingLeads({ data, reload }) {
  const leads = data.marketing_leads || [];
  const camps = data.campaigns || [];
  const integrations = data.integration_connections || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [detail, setDetail] = useState(null);

  const formsConnected = integrations.some((i) => i.key === "forms" && i.status === "connected");
  const waConnected = integrations.some((i) => i.key === "wa" && i.status === "connected");

  const moveLead = async (leadId, toStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === toStage) return;
    try {
      await updateRecord("marketing_leads", leadId, { stage: toStage });
      if (detail && detail.id === leadId) setDetail({ ...lead, stage: toStage });
      await reload();
    } catch (err) {
      alert(err.message || "Could not move the lead.");
    }
  };

  const onDragEnd = (res) => {
    if (!res.destination) return;
    const stageIdx = Number(res.destination.droppableId);
    moveLead(res.draggableId, LEAD_STAGES[stageIdx]);
  };

  const convertToClient = async (lead) => {
    if (!confirm(`Convert "${lead.name}" into a client record?`)) return;
    try {
      const client = await createRecord("clients", {
        company_name: lead.company || lead.name,
        contact_person: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
      });
      await updateRecord("marketing_leads", lead.id, {
        stage: "Won",
        converted_client_id: client.id,
      });
      if (detail && detail.id === lead.id) setDetail({ ...lead, stage: "Won", converted_client_id: client.id });
      await reload();
      alert(`${lead.company || lead.name} added to Clients.`);
    } catch (err) {
      alert(err.message || "Could not convert the lead.");
    }
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "Invalid email";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createRecord("marketing_leads", { ...form, value: Number(form.value) || 0 });
      setShowAdd(false);
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const linkedEmails = detail
    ? (data.email_messages || []).filter((m) => m.lead_id === detail.id)
    : [];

  return (
    <>
      <div className="crm-chips" style={{ marginBottom: 18, alignItems: "center" }}>
        <b>Lead capture</b>
        <span className={`crm-pill ${formsConnected ? "ok" : ""}`}>Website forms {formsConnected ? "connected" : "not connected"}</span>
        <span className={`crm-pill ${waConnected ? "ok" : ""}`}>WhatsApp {waConnected ? "connected" : "not connected"}</span>
        <button className="crm-b" style={{ marginLeft: "auto" }} onClick={() => setShowAdd(true)}>+ New lead</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(200px, 1fr))", gap: 14, overflowX: "auto" }}>
          {LEAD_STAGES.map((stage, si) => {
            const colLeads = leads.filter((l) => l.stage === stage);
            return (
              <Droppable droppableId={String(si)} key={stage}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      background: "var(--bg)", borderRadius: 14, padding: 10,
                      minHeight: 220, display: "flex", flexDirection: "column", gap: 8,
                    }}
                  >
                    <h4 style={{ margin: "2px 4px 4px", fontSize: 12, fontWeight: 600, color: "var(--mut)",
                      display: "flex", justifyContent: "space-between" }}>
                      {stage} <span>{colLeads.length}</span>
                    </h4>
                    {colLeads.map((l, idx) => (
                      <Draggable draggableId={l.id} index={idx} key={l.id}>
                        {(p) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            onClick={() => setDetail(l)}
                            className="crm-card"
                            style={{ padding: "10px 12px", cursor: "pointer", marginBottom: 8 }}
                          >
                            <b>{l.name}</b>
                            <div style={{ color: "var(--mut)", fontSize: 12 }}>{l.company} · {l.source}</div>
                            <div style={{ fontWeight: 600, marginTop: 4 }}>{formatZAR(l.value)}</div>
                            {si < 2 || si === 2 ? (
                              <button className="crm-b crm-b--g" style={{ marginTop: 8, fontSize: 12, padding: "4px 10px" }}
                                onClick={(e) => { e.stopPropagation(); moveLead(l.id, LEAD_STAGES[si + 1]); }}>
                                Move to {LEAD_STAGES[si + 1]}
                              </button>
                            ) : null}
                            {stage === "Won" && (
                              <button className="crm-b" style={{ marginTop: 8, fontSize: 12, padding: "4px 10px" }}
                                onClick={(e) => { e.stopPropagation(); convertToClient(l); }}>
                                {l.converted_client_id ? "In Clients ✓" : "Convert to client"}
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colLeads.length === 0 && (
                      <div style={{ color: "var(--mut)", fontSize: 12, padding: 8 }}>No leads here.</div>
                    )}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
      <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 14 }}>
        Tip: drag cards between stages, or use the buttons. Marking a lead as Won lets you convert it into a Clients record in one click.
      </p>

      {showAdd && (
        <Modal title="New lead" onClose={() => setShowAdd(false)} onSave={handleSave} saving={saving}>
          <ModalField label="Name" required error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </ModalField>
          <ModalField label="Company">
            <input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </ModalField>
          <ModalField label="Email" error={errors.email}>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </ModalField>
          <ModalField label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </ModalField>
          <ModalField label="Source">
            <select className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Stage">
            <select className={inputClass} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Value (R)">
            <input className={inputClass} type="number" min="0" value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </ModalField>
          <ModalField label="Campaign">
            <select className={inputClass} value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
              <option value="">None</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </ModalField>
          <ModalField label="Owner">
            <input className={inputClass} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </ModalField>
          <ModalField label="Notes">
            <textarea className={inputClass} rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </ModalField>
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}

      {detail && (
        <LeadDetail lead={detail} camps={camps} linkedEmails={linkedEmails}
          onClose={() => setDetail(null)} reload={reload} setDetail={setDetail}
          convertToClient={convertToClient} moveLead={moveLead} />
      )}
    </>
  );
}

function LeadDetail({ lead, camps, linkedEmails, onClose, reload, setDetail, convertToClient, moveLead }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(lead);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateRecord("marketing_leads", lead.id, { ...form, value: Number(form.value) || 0 });
      setDetail(form);
      setEditing(false);
      await reload();
    } catch (err) {
      alert(err.message || "Could not save the lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={lead.name} subtitle={`${lead.company || "—"} · ${lead.source} · ${formatZAR(lead.value)}`} onClose={onClose}
      footer={editing ? (
        <>
          <button className="crm-b crm-b--g" onClick={() => setEditing(false)}>Cancel</button>
          <button className="crm-b" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </>
      ) : (
        <>
          {lead.stage !== "Won" && (
            <button className="crm-b crm-b--g" onClick={() => moveLead(lead.id,
              ["New", "Contacted", "Proposal sent", "Won", "Lost"][["New", "Contacted", "Proposal sent", "Won", "Lost"].indexOf(lead.stage) + 1])}>
              Move to next stage
            </button>
          )}
          {lead.stage === "Won" && (
            <button className="crm-b" onClick={() => convertToClient(lead)}>
              {lead.converted_client_id ? "Already in Clients ✓" : "Convert to client"}
            </button>
          )}
          <button className="crm-b" onClick={() => setEditing(true)}>Edit</button>
        </>
      )}>
      {!editing ? (
        <div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: 0 }}>
            <span style={{ color: "var(--mut)" }}>Stage</span>
            <span className="crm-pill">{lead.stage}</span>
          </div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>Email</span><span>{lead.email || "—"}</span>
          </div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>Phone</span><span>{lead.phone || "—"}</span>
          </div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>Campaign</span>
            <span>{camps.find((c) => c.id === lead.campaign_id)?.name || "—"}</span>
          </div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>Owner</span><span>{lead.owner || "—"}</span>
          </div>
          <div className="crm-row" style={{ justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ color: "var(--mut)" }}>UTM</span>
            <span>{lead.utm_source || "—"} / {lead.utm_campaign || "—"}</span>
          </div>
          {lead.notes && <p style={{ color: "var(--mut)", marginTop: 14 }}>{lead.notes}</p>}

          <h3 style={{ marginTop: 22, fontSize: 14 }}>Linked emails</h3>
          {linkedEmails.length === 0 ? (
            <div style={{ color: "var(--mut)", fontSize: 13 }}>No linked emails. Inbound mail from this lead's address is linked automatically.</div>
          ) : linkedEmails.map((m) => (
            <div className="crm-row" key={m.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ flex: 1 }}>
                <b>{m.subject || "(no subject)"}</b>
                <div style={{ color: "var(--mut)", fontSize: 12 }}>{m.direction} · {m.from_email}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <ModalField label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></ModalField>
          <ModalField label="Company"><input className={inputClass} value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></ModalField>
          <ModalField label="Email"><input className={inputClass} value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></ModalField>
          <ModalField label="Phone"><input className={inputClass} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></ModalField>
          <ModalField label="Source">
            <select className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Stage">
            <select className={inputClass} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Value (R)"><input className={inputClass} type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></ModalField>
          <ModalField label="Campaign">
            <select className={inputClass} value={form.campaign_id || ""} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}>
              <option value="">None</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </ModalField>
          <ModalField label="Owner"><input className={inputClass} value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></ModalField>
          <ModalField label="Notes"><textarea className={inputClass} rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></ModalField>
        </div>
      )}
    </Drawer>
  );
}
