import { useState } from "react";
import { createRecord, updateRecord } from "@/api/data";
import { CONTENT_PLATFORMS, CONTENT_STATUSES, statusPillClass } from "@/lib/marketingConstants";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "X", "Blog", "Email"];

export default function MarketingSocial({ data, reload }) {
  const content = (data.content_items || []).filter((c) =>
    ["Instagram", "Facebook", "LinkedIn", "TikTok", "X"].includes(c.platform)
  );
  const integrations = data.integration_connections || [];
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ title: "", platform: "Instagram", caption: "", publish_date: "", status: "Idea" });
  const [saving, setSaving] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);

  const meta = integrations.some((i) => i.key === "meta" && i.status === "connected");
  const li = integrations.some((i) => i.key === "li" && i.status === "connected");
  const tt = integrations.some((i) => i.key === "tt" && i.status === "connected");

  const compose = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createRecord("content_items", { ...form, platform: form.platform, status: form.status || "Idea" });
      setShowCompose(false);
      setForm({ title: "", platform: "Instagram", caption: "", publish_date: "", status: "Idea" });
      await reload();
    } catch (err) {
      alert(err.message || "Could not create the post.");
    } finally {
      setSaving(false);
    }
  };

  const saveMetrics = async () => {
    setSaving(true);
    try {
      await updateRecord("content_items", editingMetric.id, {
        reach: Number(editingMetric.reach) || 0,
        likes: Number(editingMetric.likes) || 0,
        clicks: Number(editingMetric.clicks) || 0,
      });
      setEditingMetric(null);
      await reload();
    } catch (err) {
      alert(err.message || "Could not save metrics.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="crm-chips" style={{ marginBottom: 18, alignItems: "center" }}>
        <b>Accounts</b>
        <span className={`crm-pill ${meta ? "ok" : ""}`}>Facebook & Instagram {meta ? "connected" : "not connected"}</span>
        <span className={`crm-pill ${li ? "ok" : ""}`}>LinkedIn {li ? "connected" : "not connected"}</span>
        <span className={`crm-pill ${tt ? "ok" : ""}`}>TikTok {tt ? "connected" : "not connected"}</span>
        <span style={{ color: "var(--mut)", fontSize: 12 }}>Connected accounts sync metrics and can publish posts.</span>
        <button className="crm-b" style={{ marginLeft: "auto" }} onClick={() => setShowCompose(true)}>+ Compose</button>
      </div>

      {content.length === 0 ? (
        <div className="crm-empty">No social posts yet. Compose your first post.</div>
      ) : (
        <div className="crm-grid crm-k3">
          {content.map((c) => (
            <div className="crm-card" key={c.id}>
              <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {c.platform}
                <span className={`crm-pill ${statusPillClass(c.status)}`}>{c.status}</span>
              </h3>
              <div style={{
                background: "var(--soft)", borderRadius: 12, minHeight: 110, display: "grid", placeItems: "center",
                color: "var(--p)", fontSize: 28, fontFamily: "'Barlow Condensed', Arial", marginBottom: 12,
              }}>
                {c.title || `${c.platform} post`}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 10px" }}>{c.caption || "No caption."}</p>
              <div style={{ color: "var(--mut)", fontSize: 12 }}>
                Reach {(Number(c.reach) || 0).toLocaleString("en-ZA")} · Likes {c.likes} · Clicks {c.clicks}
              </div>
              <button className="crm-b crm-b--g" style={{ marginTop: 10, fontSize: 12 }}
                onClick={() => setEditingMetric(c)}>Log metrics</button>
            </div>
          ))}
        </div>
      )}

      {showCompose && (
        <Modal title="Compose post" onClose={() => setShowCompose(false)} onSave={compose} saving={saving}>
          <ModalField label="Title / hook" required>
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </ModalField>
          <ModalField label="Platform">
            <select className={inputClass} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {["Instagram", "Facebook", "LinkedIn", "TikTok", "X"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </ModalField>
          <ModalField label="Caption">
            <textarea className={inputClass} rows={4} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          </ModalField>
          <ModalField label="Schedule date">
            <input className={inputClass} type="date" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
          </ModalField>
          <ModalField label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
        </Modal>
      )}

      {editingMetric && (
        <Modal title={`Log metrics — ${editingMetric.title}`} onClose={() => setEditingMetric(null)} onSave={saveMetrics} saving={saving}>
          <ModalField label="Reach"><input className={inputClass} type="number" value={editingMetric.reach || 0} onChange={(e) => setEditingMetric({ ...editingMetric, reach: e.target.value })} /></ModalField>
          <ModalField label="Likes"><input className={inputClass} type="number" value={editingMetric.likes || 0} onChange={(e) => setEditingMetric({ ...editingMetric, likes: e.target.value })} /></ModalField>
          <ModalField label="Clicks"><input className={inputClass} type="number" value={editingMetric.clicks || 0} onChange={(e) => setEditingMetric({ ...editingMetric, clicks: e.target.value })} /></ModalField>
        </Modal>
      )}
    </>
  );
}
