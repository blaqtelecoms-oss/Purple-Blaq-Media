import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCrm } from "@/lib/CrmContext";
import { formatZAR, formatDate, canAccess, canEditFinance } from "@/lib/crmConstants";
import CrmPageHeader from "@/components/crm/CrmPageHeader";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";
import ConfirmDialog from "@/components/crm/ConfirmDialog";
import FileUpload from "@/components/crm/FileUpload";
import { SignedLink } from "@/components/crm/SignedFile";

function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map((h) => esc(h.label)).join(","), ...rows.map((r) => headers.map((h) => esc(h.get(r))).join(","))].join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Finance() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [clients, setClients] = useState([]);
  const [tab, setTab] = useState("tx");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ type: "in", date: "", description: "", category: "", client_id: "", amount: 0, status: "Paid", invoice: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([
        base44.entities.Transaction.list(),
        base44.entities.Client.list(),
      ]);
      setTx(t);
      setClients(c);
    } catch {
      setTx([]);
    }
  }, []);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "finance")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canEdit = canEditFinance(member?.role);
  const clientName = (cid) => clients.find((c) => c.id === cid)?.company_name || "—";

  const validate = () => {
    const er = {};
    if (!form.date) er.date = "Date is required";
    if (!form.description.trim()) er.description = "Description is required";
    if (!form.amount || Number(form.amount) <= 0) er.amount = "Amount must be positive";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await base44.entities.Transaction.create({
        ...form,
        amount: Number(form.amount) || 0,
        client_id: form.client_id || "",
      });
      setShowAdd(false);
      setForm({ type: "in", date: "", description: "", category: "", client_id: "", amount: 0, status: "Paid", invoice: "" });
      await load();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Transaction.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      /* ignore */
    }
  };

  const exportCsv = () => {
    if (tab === "tx") {
      downloadCsv("transactions.csv", toCsv([...tx].reverse(), [
        { label: "Date", get: (t) => formatDate(t.date) },
        { label: "Description", get: (t) => t.description },
        { label: "Category", get: (t) => t.category },
        { label: "Client", get: (t) => clientName(t.client_id) },
        { label: "Type", get: (t) => t.type },
        { label: "Amount", get: (t) => t.amount },
        { label: "Status", get: (t) => t.status },
      ]));
    } else {
      let bal = 0;
      const rows = [...tx].filter((t) => t.status === "Paid").sort((a, b) => (a.date < b.date ? -1 : 1));
      const withBal = rows.map((t) => {
        bal += t.type === "in" ? t.amount : -t.amount;
        return { ...t, balance: bal };
      });
      downloadCsv("ledger.csv", toCsv(withBal, [
        { label: "Date", get: (t) => formatDate(t.date) },
        { label: "Description", get: (t) => t.description },
        { label: "Category", get: (t) => t.category },
        { label: "Debit", get: (t) => (t.type === "out" ? t.amount : "") },
        { label: "Credit", get: (t) => (t.type === "in" ? t.amount : "") },
        { label: "Balance", get: (t) => t.balance },
      ]));
    }
  };

  if (tx === null) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  const paid = tx.filter((t) => t.status === "Paid");
  const inc = paid.filter((t) => t.type === "in").reduce((a, t) => a + t.amount, 0);
  const exp = paid.filter((t) => t.type === "out").reduce((a, t) => a + t.amount, 0);
  const pen = tx.filter((t) => t.status === "Pending").reduce((a, t) => a + t.amount, 0);

  return (
    <>
      <CrmPageHeader
        title="Finance"
        em="& ledger"
        action={canEdit}
        actionLabel="+ Add transaction"
        onAction={() => setShowAdd(true)}
      />
      <div className="crm-grid crm-k4" style={{ marginBottom: 18 }}>
        <div className="crm-card crm-card--h crm-kpi"><small>Income</small><b className="up">{formatZAR(inc)}</b><span>Paid</span></div>
        <div className="crm-card crm-card--h crm-kpi"><small>Expenses</small><b className="dn">{formatZAR(exp)}</b><span>Paid</span></div>
        <div className="crm-card crm-card--h crm-kpi"><small>Net balance</small><b>{formatZAR(inc - exp)}</b><span>Cash position</span></div>
        <div className="crm-card crm-card--h crm-kpi"><small>Pending</small><b className="dn">{formatZAR(pen)}</b><span>Unpaid invoices</span></div>
      </div>

      <div className="crm-chips">
        <button className={tab === "tx" ? "on" : ""} onClick={() => setTab("tx")}>Transactions</button>
        <button className={tab === "led" ? "on" : ""} onClick={() => setTab("led")}>Ledger</button>
        <button className="crm-chips-export" onClick={exportCsv}>Export CSV</button>
      </div>

      {tab === "tx" ? (
        <div className="crm-card crm-sc">
          {tx.length === 0 ? (
            <div className="crm-empty">No transactions yet, add your first transaction.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Client</th><th>Status</th><th>Invoice</th><th className="crm-r">Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {[...tx].reverse().map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.description}<br /><small style={{ color: "var(--mut)" }}>{t.category || "—"}</small></td>
                    <td>{t.client_id ? clientName(t.client_id) : "—"}</td>
                    <td><span className={`crm-pill ${t.status === "Paid" ? "ok" : "warn"}`}>{t.status}</span></td>
                    <td>{t.invoice ? <SignedLink fileUri={t.invoice} filename={t.invoice} /> : <small style={{ color: "var(--mut)" }}>None</small>}</td>
                    <td className="crm-r"><b className={t.type === "in" ? "up" : "dn"}>{t.type === "in" ? "+" : "-"}{formatZAR(t.amount)}</b></td>
                    <td className="crm-r">{canEdit && <button className="crm-b crm-b--d" onClick={() => setDeleteId(t.id)}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="crm-card crm-sc">
          {tx.length === 0 ? (
            <div className="crm-empty">No ledger entries yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Category</th><th className="crm-r">Debit</th><th className="crm-r">Credit</th><th className="crm-r">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let b = 0;
                  return [...tx].filter((t) => t.status === "Paid").sort((a, c) => (a.date < c.date ? -1 : 1)).map((t) => {
                    b += t.type === "in" ? t.amount : -t.amount;
                    return (
                      <tr key={t.id}>
                        <td>{formatDate(t.date)}</td>
                        <td>{t.description}</td>
                        <td>{t.category || "—"}</td>
                        <td className="crm-r">{t.type === "out" ? formatZAR(t.amount) : ""}</td>
                        <td className="crm-r">{t.type === "in" ? formatZAR(t.amount) : ""}</td>
                        <td className="crm-r"><b>{formatZAR(b)}</b></td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showAdd && (
        <Modal title="Add transaction" onClose={() => setShowAdd(false)} onSave={handleSave} saving={saving}>
          <ModalField label="Type">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="in">Income</option>
              <option value="out">Expense</option>
            </select>
          </ModalField>
          <ModalField label="Date" required error={errors.date}>
            <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </ModalField>
          <ModalField label="Description" required error={errors.description}>
            <input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </ModalField>
          <ModalField label="Category">
            <input className={inputClass} placeholder="e.g. Hosting, Project payment" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </ModalField>
          <ModalField label="Client (optional)">
            <select className={inputClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">None</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Amount (R)" required error={errors.amount}>
            <input className={inputClass} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </ModalField>
          <ModalField label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </ModalField>
          <FileUpload label="Invoice (PDF or image)" accept="application/pdf,image/*" value={form.invoice} onChange={(v) => setForm({ ...form, invoice: v })} />
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Delete this transaction?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}