import { useState } from "react";
import { createRecord, updateRecord, deleteRecord } from "@/api/data";
import { formatZAR, formatDate } from "@/lib/crmConstants";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, statusPillClass, roi, leadsForCampaign } from "@/lib/marketingConstants";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";

const emptyForm = {
  name: "", channel: "Facebook Ads", budget: 0, spend: 0, revenue: 0,
  status: "Planned", start_date: "", end_date: "",
  external_account: "none", external_id: "",
};

export default function MarketingCampaigns({ data, reload }) {
  const camps = data.campaigns || [];
  const leads = data.marketing_leads || [];
  const budgets = data.marketing_budgets || [];
  const integrations = data.integration_connections || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);

  const now = new Date();
  const monthBudget = budgets.find((b) => {
    const d = new Date(b.month);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSpend = camps.reduce((a, c) => a + (Number(c.spend) || 0), 0);
  const budgetAmount = monthBudget ? Number(monthBudget.amount) || 0 : 0;
  const budgetPct = budgetAmount > 0 ? Math.round((totalSpend / budgetAmount) * 100) : 0;
  const over80 = budgetAmount > 0 && budgetPct >= 80;

  const gads = integrations.some((i) => i.key === "gads" && i.status === "connected");
  const mads = integrations.some((i) => i.key === "mads" && i.status === "connected");

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Campaign name is required";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const values = {
        ...form,
        budget: Number(form.budget) || 0,
        spend: Number(form.spend) || 0,
        revenue: Number(form.revenue) || 0,
      };
      if (editing) {
        await updateRecord("campaigns", editing.id, values);
        setEditing(null);
      } else {
        await createRecord("campaigns", values);
        setShowAdd(false);
      }
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name, channel: c.channel || "Facebook Ads", budget: c.budget || 0,
      spend: c.spend || 0, revenue: c.revenue || 0, status: c.status || "Planned",
      start_date: c.start_date || "", end_date: c.end_date || "",
      external_account: c.external_account || "none", external_id: c.external_id || "",
    });
  };

  const removeCampaign = async (c) => {
    if (!confirm(`Delete "${c.name}"? Its matching Finance expense will also be removed.`)) return;
    try {
      await deleteRecord("campaigns", c.id);
      await reload();
    } catch (err) {
      alert(err.message || "Could not delete the campaign.");
    }
  };

  const pullSpend = () => {
    if (!gads && !mads) {
      alert("Connect a Google Ads or Meta Ads account on the Integrations tab first.");
      return;
    }
    alert("Pulling real spend from connected ad accounts will be available once Phase 3 is complete. For now, update spend manually on each campaign.");
  };

  return (
    <>
      <div className="crm-chips" style={{ marginBottom: 18, alignItems: "center" }}>
        <b>Ad accounts</b>
        <span className={`crm-pill ${gads ? "ok" : ""}`}>Google Ads {gads ? "connected" : "not connected"}</span>
        <span className={`crm-pill ${mads ? "ok" : ""}`}>Meta Ads {mads ? "connected" : "not connected"}</span>
        <button className="crm-b crm-b--g" style={{ marginLeft: "auto" }} onClick={pullSpend}>Pull spend</button>
        <button className="crm-b" onClick={() => { setShowAdd(true); setForm(emptyForm); }}>+ New campaign</button>
      </div>

      <div className="crm-card crm-sc" style={{ marginBottom: 18 }}>
        {camps.length === 0 ? (
          <div className="crm-empty">No campaigns yet. Add your first campaign.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Campaign</th><th>Channel</th><th>Spend / budget</th><th>Leads</th>
                <th>Revenue</th><th>ROI</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {camps.map((c) => {
                const leadCount = leadsForCampaign(leads, c.id).length;
                const r = roi(c);
                const spendPct = c.budget > 0 ? Math.min(100, Math.round((c.spend / c.budget) * 100)) : 0;
                return (
                  <tr key={c.id}>
                    <td><b>{c.name}</b></td>
                    <td>{c.channel}</td>
                    <td style={{ minWidth: 150 }}>
                      {formatZAR(c.spend)} / {formatZAR(c.budget)}
                      <div className="crm-prog" style={{ marginTop: 5 }}>
                        <i style={{ width: `${spendPct}%` }} />
                      </div>
                    </td>
                    <td>{leadCount}</td>
                    <td>{formatZAR(c.revenue)}</td>
                    <td className={r !== null && r >= 0 ? "up" : "dn"}>{r === null ? "–" : r + "%"}</td>
                    <td><span className={`crm-pill ${statusPillClass(c.status)}`}>{c.status}</span></td>
                    <td>
                      <button className="crm-b crm-b--g" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => openEdit(c)}>Edit</button>{" "}
                      <button className="crm-b crm-b--d" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => removeCampaign(c)}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="crm-card">
          <h3>Monthly budget</h3>
          {budgetAmount > 0 ? (
            <>
              <div className="crm-kpi">
                <b style={{ fontSize: 34 }}>{formatZAR(totalSpend)} <span style={{ color: "var(--mut)", fontSize: 13, fontFamily: "Inter" }}>of {formatZAR(budgetAmount)}</span></b>
              </div>
              <div className="crm-prog" style={{ marginTop: 10 }}>
                <i style={{ width: `${Math.min(100, budgetPct)}%` }} />
              </div>
              <p className={over80 ? "dn" : ""} style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                {budgetPct}% used.{over80 ? " Over the 80% alert line." : ""}
              </p>
            </>
          ) : (
            <div className="crm-empty">No budget set for this month. Add one on the Tools tab or via the budget field.</div>
          )}
        </div>

        <div className="crm-card">
          <h3>Finance link</h3>
          <p style={{ color: "var(--mut)", fontSize: 13, lineHeight: 1.6 }}>
            Campaign spend posts to Finance → Expenses automatically as category "Marketing", so revenue attribution reflects real costs. The sync happens instantly when you change a campaign's spend.
          </p>
          <button className="crm-b crm-b--g" onClick={reload}>Refresh</button>
        </div>
      </div>

      {(showAdd || editing) && (
        <Modal title={editing ? "Edit campaign" : "New campaign"} onClose={() => { setShowAdd(false); setEditing(null); }} onSave={handleSave} saving={saving}>
          <ModalField label="Campaign name" required error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </ModalField>
          <ModalField label="Channel">
            <select className={inputClass} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              {CAMPAIGN_CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </ModalField>
          <ModalField label="Budget (R)">
            <input className={inputClass} type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </ModalField>
          <ModalField label="Spend (R) — creates/updates the matching Finance expense">
            <input className={inputClass} type="number" min="0" value={form.spend} onChange={(e) => setForm({ ...form, spend: e.target.value })} />
          </ModalField>
          <ModalField label="Revenue (R)">
            <input className={inputClass} type="number" min="0" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} />
          </ModalField>
          <ModalField label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {CAMPAIGN_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Start date">
            <input className={inputClass} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </ModalField>
          <ModalField label="End date">
            <input className={inputClass} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </ModalField>
          <ModalField label="External ad account">
            <select className={inputClass} value={form.external_account} onChange={(e) => setForm({ ...form, external_account: e.target.value })}>
              <option value="none">None</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Meta Ads">Meta Ads</option>
            </select>
          </ModalField>
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}
    </>
  );
}
