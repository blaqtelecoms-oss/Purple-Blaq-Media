import { useState } from "react";
import { createRecord, deleteRecord } from "@/api/data";
import { ModalField, inputClass } from "@/components/crm/Modal";
import Modal from "@/components/crm/Modal";

export default function MarketingTools({ data, reload }) {
  const clients = data.clients || [];
  const projects = data.projects || [];
  const testimonials = data.testimonials || [];
  const competitors = data.competitors || [];
  const budgets = data.marketing_budgets || [];

  const [utm, setUtm] = useState({ url: "https://purpleblaq.co.za", campaign: "spring_launch", source: "facebook" });
  const [utmResult, setUtmResult] = useState("");
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", offering: "", pricing: "", notes: "" });
  const [showBudget, setShowBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ month: "", amount: 0 });
  const [saving, setSaving] = useState(false);

  const generateUtm = () => {
    const link = `${utm.url}?utm_source=${utm.source}&utm_medium=social&utm_campaign=${encodeURIComponent(utm.campaign)}`;
    setUtmResult(link);
    navigator.clipboard?.writeText(link);
  };

  const clientName = (id) => clients.find((c) => c.id === id)?.company_name || "—";
  const projectName = (id) => projects.find((p) => p.id === id)?.name || "—";

  const addCompetitor = async () => {
    if (!compForm.name.trim()) return;
    setSaving(true);
    try {
      await createRecord("competitors", compForm);
      setShowCompetitor(false);
      setCompForm({ name: "", offering: "", pricing: "", notes: "" });
      await reload();
    } catch (err) {
      alert(err.message || "Could not add the competitor.");
    } finally {
      setSaving(false);
    }
  };

  const addBudget = async () => {
    if (!budgetForm.month) return;
    setSaving(true);
    try {
      await createRecord("marketing_budgets", { month: budgetForm.month, amount: Number(budgetForm.amount) || 0 });
      setShowBudget(false);
      setBudgetForm({ month: "", amount: 0 });
      await reload();
    } catch (err) {
      alert(err.message || "Could not set the budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 18 }}>
        <div className="crm-card">
          <h3>UTM link builder</h3>
          <ModalField label="Website URL"><input className={inputClass} value={utm.url} onChange={(e) => setUtm({ ...utm, url: e.target.value })} /></ModalField>
          <ModalField label="Campaign name"><input className={inputClass} value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} /></ModalField>
          <ModalField label="Source">
            <select className={inputClass} value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })}>
              {["facebook", "instagram", "newsletter", "google", "linkedin", "tiktok"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <button className="crm-b" style={{ marginTop: 12 }} onClick={generateUtm}>Generate & copy link</button>
          {utmResult && <p style={{ color: "var(--mut)", fontSize: 13, wordBreak: "break-all", marginTop: 12 }}>{utmResult}</p>}
        </div>

        <div className="crm-card">
          <h3>Testimonials <span style={{ color: "var(--mut)", fontSize: 12, fontWeight: 400 }}>From completed projects</span></h3>
          {testimonials.length === 0 ? (
            <div className="crm-empty">No testimonials yet. Request one from a client below.</div>
          ) : testimonials.map((t) => (
            <div className="crm-row" key={t.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ flex: 1 }}>
                <b>"{t.quote}"</b>
                <div style={{ color: "var(--mut)", fontSize: 12 }}>{clientName(t.client_id)} · {projectName(t.project_id)}</div>
                {t.approved && <span className="crm-pill ok">Approved</span>}
              </div>
            </div>
          ))}
          <button className="crm-b crm-b--g" style={{ marginTop: 12 }}
            onClick={() => alert("Open a project or client record and use the contact email to request a testimonial.")}>
            Request testimonial
          </button>

          <h3 style={{ marginTop: 22 }}>Competitor notes</h3>
          {competitors.length === 0 ? (
            <div className="crm-empty">No competitors tracked yet.</div>
          ) : competitors.map((c) => (
            <div className="crm-row" key={c.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <b>{c.name}</b>
                <div style={{ color: "var(--mut)", fontSize: 12 }}>{c.offering} · {c.pricing}</div>
                {c.notes && <div style={{ color: "var(--mut)", fontSize: 11 }}>{c.notes}</div>}
              </div>
              <button className="crm-b crm-b--d" onClick={() => deleteRecord("competitors", c.id).then(reload)}>×</button>
            </div>
          ))}
          <button className="crm-b" style={{ marginTop: 12 }} onClick={() => setShowCompetitor(true)}>+ Add competitor</button>
        </div>
      </div>

      <div className="crm-card">
        <h3>Monthly budgets <button className="crm-b crm-b--g" style={{ float: "right" }} onClick={() => setShowBudget(true)}>+ Set budget</button></h3>
        {budgets.length === 0 ? (
          <div className="crm-empty">No budgets set yet.</div>
        ) : (
          <table>
            <thead><tr><th>Month</th><th>Amount</th></tr></thead>
            <tbody>
              {budgets.map((b) => (
                <tr key={b.id}>
                  <td>{new Date(b.month).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</td>
                  <td>R{Number(b.amount).toLocaleString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCompetitor && (
        <Modal title="Add competitor" onClose={() => setShowCompetitor(false)} onSave={addCompetitor} saving={saving}>
          <ModalField label="Name" required><input className={inputClass} value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} /></ModalField>
          <ModalField label="Offering"><input className={inputClass} value={compForm.offering} onChange={(e) => setCompForm({ ...compForm, offering: e.target.value })} /></ModalField>
          <ModalField label="Pricing"><input className={inputClass} value={compForm.pricing} onChange={(e) => setCompForm({ ...compForm, pricing: e.target.value })} /></ModalField>
          <ModalField label="Notes"><textarea className={inputClass} rows={3} value={compForm.notes} onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })} /></ModalField>
        </Modal>
      )}

      {showBudget && (
        <Modal title="Set monthly budget" onClose={() => setShowBudget(false)} onSave={addBudget} saving={saving}>
          <ModalField label="Month" required><input className={inputClass} type="month" value={budgetForm.month} onChange={(e) => setBudgetForm({ ...budgetForm, month: e.target.value })} /></ModalField>
          <ModalField label="Amount (R)" required><input className={inputClass} type="number" min="0" value={budgetForm.amount} onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })} /></ModalField>
        </Modal>
      )}
    </>
  );
}
