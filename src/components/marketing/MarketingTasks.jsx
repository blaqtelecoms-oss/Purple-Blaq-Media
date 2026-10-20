import { useState } from "react";
import { createRecord, updateRecord } from "@/api/data";
import { supabase } from "@/utils/supabase";
import { TASK_STATUSES, statusPillClass } from "@/lib/marketingConstants";
import { ModalField, inputClass } from "@/components/crm/Modal";
import Modal from "@/components/crm/Modal";

const COLS = ["To do", "In progress", "Done"];

export default function MarketingTasks({ data, reload }) {
  const tasks = data.marketing_tasks || [];
  const team = data.team_members || [];
  const integrations = data.integration_connections || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", assignee: "", due_date: "", status: "To do", requested_from: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const googleConnected = integrations.some((i) => i.key === "google" && i.status === "connected");

  const syncTasks = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tasks-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed.");
      alert(result.message || "Tasks synced.");
      await reload();
    } catch (err) {
      alert(err.message || "Could not sync Google Tasks.");
    } finally {
      setSyncing(false);
    }
  };

  const add = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createRecord("marketing_tasks", form);
      setShowAdd(false);
      setForm({ title: "", assignee: "", due_date: "", status: "To do", requested_from: "" });
      await reload();
      // If Google is connected, sync to push the new task to Google Tasks
      if (googleConnected) {
        await syncTasks();
      }
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
      <div className="crm-top" style={{ marginBottom: 18, alignItems: "center" }}>
        <div>
          <div className="crm-sub">Marketing can request work from other team members, e.g. "need a landing page built".</div>
          {googleConnected && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="crm-pill ok">Google Tasks connected</span>
              <button className="crm-b crm-b--g" style={{ fontSize: 12 }} onClick={syncTasks} disabled={syncing}>
                {syncing ? "Syncing…" : "Sync with Google Tasks"}
              </button>
            </div>
          )}
        </div>
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
                  {t.source_data?.google_task_id && (
                    <div style={{ color: "var(--mut)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 9 }}>🔵</span> Google Tasks
                    </div>
                  )}
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
          {googleConnected && (
            <p style={{ color: "var(--mut)", fontSize: 12, marginTop: 8 }}>Saving will also push this task to Google Tasks.</p>
          )}
        </Modal>
      )}
    </>
  );
}
