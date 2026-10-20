import { useState } from "react";
import { createRecord, updateRecord } from "@/api/data";
import { TASK_STATUSES, statusPillClass } from "@/lib/marketingConstants";
import { ModalField, inputClass } from "@/components/crm/Modal";
import Modal from "@/components/crm/Modal";

const COLS = ["To do", "In progress", "Done"];

export default function MarketingTasks({ data, reload }) {
  const tasks = data.marketing_tasks || [];
  const team = data.team_members || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", assignee: "", due_date: "", status: "To do", requested_from: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createRecord("marketing_tasks", form);
      setShowAdd(false);
      setForm({ title: "", assignee: "", due_date: "", status: "To do", requested_from: "" });
      await reload();
    } catch (err) {
      alert(err.message || "Could not create the task.");
    } finally {
      setSaving(false);
    }
  };

  const move = async (task, toCol) => {
    try {
      await updateRecord("marketing_tasks", task.id, { status: toCol });
      await reload();
    } catch (err) {
      alert(err.message || "Could not move the task.");
    }
  };

  return (
    <>
      <div className="crm-top" style={{ marginBottom: 18 }}>
        <div className="crm-sub">Marketing can request work from other team members, e.g. "need a landing page built".</div>
        <button className="crm-b" onClick={() => setShowAdd(true)}>+ New task</button>
      </div>

      <div className="crm-grid crm-k3">
        {COLS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} style={{
              background: "var(--bg)", borderRadius: 14, padding: 10, minHeight: 220,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <h4 style={{ margin: "2px 4px 4px", fontSize: 12, fontWeight: 600, color: "var(--mut)",
                display: "flex", justifyContent: "space-between" }}>
                {col} <span>{colTasks.length}</span>
              </h4>
              {colTasks.length === 0 && <div style={{ color: "var(--mut)", fontSize: 12, padding: 8 }}>No tasks.</div>}
              {colTasks.map((t) => (
                <div className="crm-card" key={t.id} style={{ padding: "10px 12px" }}>
                  <b>{t.title}</b>
                  <div style={{ color: "var(--mut)", fontSize: 12 }}>{t.assignee || "Unassigned"} · due {t.due_date || "—"}</div>
                  {t.requested_from && <div style={{ color: "var(--mut)", fontSize: 11 }}>Requested from: {t.requested_from}</div>}
                  {col !== "Done" && (
                    <button className="crm-b crm-b--g" style={{ marginTop: 8, fontSize: 12, padding: "4px 10px" }}
                      onClick={() => move(t, COLS[COLS.indexOf(col) + 1])}>
                      Move to {COLS[COLS.indexOf(col) + 1]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="New task" onClose={() => setShowAdd(false)} onSave={add} saving={saving}>
          <ModalField label="Title" required><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></ModalField>
          <ModalField label="Assignee">
            <select className={inputClass} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
              <option value="">Unassigned</option>
              {team.map((m) => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
            </select>
          </ModalField>
          <ModalField label="Due date"><input className={inputClass} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></ModalField>
          <ModalField label="Requested from (team member)">
            <select className={inputClass} value={form.requested_from} onChange={(e) => setForm({ ...form, requested_from: e.target.value })}>
              <option value="">None</option>
              {team.map((m) => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
            </select>
          </ModalField>
          <ModalField label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
        </Modal>
      )}
    </>
  );
}
