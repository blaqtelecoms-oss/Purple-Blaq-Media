import { useState } from "react";
import { createRecord, updateRecord } from "@/api/data";
import { supabase } from "@/utils/supabase";
import { CONTENT_PLATFORMS, CONTENT_STATUSES, statusPillClass } from "@/lib/marketingConstants";
import Drawer from "@/components/marketing/Drawer";
import { ModalField, inputClass } from "@/components/crm/Modal";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_COLORS = {
  Idea: "var(--soft)", Drafting: "#e8eefb", Review: "#fdf1dc",
  Scheduled: "#e3f5ec", Published: "#e3f5ec",
};

export default function MarketingCalendar({ data, reload }) {
  const content = data.content_items || [];
  const integrations = data.integration_connections || [];
  const [cursor, setCursor] = useState(new Date());
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const gcal = integrations.some((i) => i.key === "gcal" && i.status === "connected");
  const [syncing, setSyncing] = useState(false);

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed.");
      alert(result.message || "Calendar synced.");
      await reload();
    } catch (err) {
      alert(err.message || "Could not sync to Google Calendar.");
    } finally {
      setSyncing(false);
    }
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const itemsByDate = {};
  content.forEach((c) => {
    if (!c.publish_date) return;
    const d = new Date(c.publish_date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!itemsByDate[day]) itemsByDate[day] = [];
      itemsByDate[day].push(c);
    }
  });

  const cells = [];
  DAY_NAMES.forEach((d) => cells.push(<div key={`h${d}`} style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600, padding: "2px 4px" }}>{d}</div>));
  for (let i = 0; i < startOffset; i++) cells.push(<div key={`e${i}`} />);

  const save = async () => {
    setSaving(true);
    try {
      await updateRecord("content_items", detail.id, {
        title: detail.title, platform: detail.platform, status: detail.status,
        publish_date: detail.publish_date, owner: detail.owner, caption: detail.caption,
      });
      setDetail(null);
      await reload();
    } catch (err) {
      alert(err.message || "Could not save the content item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="crm-chips" style={{ marginBottom: 18, alignItems: "center" }}>
        <b>Calendar sync</b>
        <span className={`crm-pill ${gcal ? "ok" : ""}`}>Google Calendar {gcal ? "connected" : "not connected"}</span>
        {gcal && (
          <button className="crm-b crm-b--g" style={{ fontSize: 12 }} onClick={syncCalendar} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        )}
        <span style={{ color: "var(--mut)", fontSize: 12, marginLeft: "auto" }}>Idea → Drafting → Review → Scheduled → Published</span>
      </div>

      <div className="crm-card">
        <div className="crm-top" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{monthName}</h3>
          <div>
            <button className="crm-b crm-b--g" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹ Prev</button>{" "}
            <button className="crm-b crm-b--g" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next ›</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {cells}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <div key={d} style={{ minHeight: 84, background: "var(--bg)", borderRadius: 10, padding: 6, fontSize: 11, minWidth: 0 }}>
              <span style={{ color: "var(--mut)", fontWeight: 600 }}>{d}</span>
              {(itemsByDate[d] || []).map((c) => (
                <span key={c.id} title={`${c.title} · ${c.platform} · ${c.status}`}
                  onClick={() => setDetail(c)}
                  style={{
                    display: "block", marginTop: 4, padding: "3px 6px", borderRadius: 6,
                    background: STATUS_COLORS[c.status] || "var(--soft)", color: "var(--p)", fontWeight: 600,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer",
                  }}>
                  {c.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <Drawer title={detail.title} subtitle={`${detail.platform} · ${detail.status}`} onClose={() => setDetail(null)}
          footer={
            <>
              <button className="crm-b crm-b--g" onClick={() => setDetail(null)}>Cancel</button>
              <button className="crm-b" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </>
          }>
          <ModalField label="Title"><input className={inputClass} value={detail.title || ""} onChange={(e) => setDetail({ ...detail, title: e.target.value })} /></ModalField>
          <ModalField label="Platform">
            <select className={inputClass} value={detail.platform} onChange={(e) => setDetail({ ...detail, platform: e.target.value })}>
              {CONTENT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </ModalField>
          <ModalField label="Status">
            <select className={inputClass} value={detail.status} onChange={(e) => setDetail({ ...detail, status: e.target.value })}>
              {CONTENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </ModalField>
          <ModalField label="Publish date">
            <input className={inputClass} type="date" value={detail.publish_date || ""} onChange={(e) => setDetail({ ...detail, publish_date: e.target.value })} />
          </ModalField>
          <ModalField label="Owner"><input className={inputClass} value={detail.owner || ""} onChange={(e) => setDetail({ ...detail, owner: e.target.value })} /></ModalField>
          <ModalField label="Caption"><textarea className={inputClass} rows={3} value={detail.caption || ""} onChange={(e) => setDetail({ ...detail, caption: e.target.value })} /></ModalField>
        </Drawer>
      )}
    </>
  );
}
