import { useState } from "react";
import { createRecord, deleteRecord } from "@/api/data";
import FileUpload from "@/components/crm/FileUpload";
import { SignedLink } from "@/components/crm/SignedFile";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";

const BRAND_COLOURS = [
  { hex: "#5e1a96", name: "Purple" },
  { hex: "#2a0b45", name: "Deep plum" },
  { hex: "#efe8f8", name: "Lavender" },
  { hex: "#17121f", name: "Ink" },
  { hex: "#14996b", name: "Success" },
];

export default function MarketingAssets({ data, reload }) {
  const assets = data.brand_assets || [];
  const integrations = data.integration_connections || [];
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ name: "", url_or_value: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");

  const drive = integrations.some((i) => i.key === "drive" && i.status === "connected");
  const canva = integrations.some((i) => i.key === "canva" && i.status === "connected");

  const files = assets.filter((a) => a.kind === "file");
  const colours = assets.filter((a) => a.kind === "colour");
  const fonts = assets.filter((a) => a.kind === "font");

  const copyHex = (hex) => {
    navigator.clipboard?.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(""), 1500);
  };

  const upload = async () => {
    if (!form.name.trim() || !form.url_or_value) return;
    setSaving(true);
    try {
      await createRecord("brand_assets", { ...form, kind: "file" });
      setShowUpload(false);
      setForm({ name: "", url_or_value: "", category: "" });
      await reload();
    } catch (err) {
      alert(err.message || "Could not upload the file.");
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (a) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    try {
      await deleteRecord("brand_assets", a.id);
      await reload();
    } catch (err) {
      alert(err.message || "Could not delete the asset.");
    }
  };

  return (
    <>
      <div className="crm-chips" style={{ marginBottom: 18, alignItems: "center" }}>
        <b>File sources</b>
        <span className={`crm-pill ${drive ? "ok" : ""}`}>Google Drive {drive ? "connected" : "not connected"}</span>
        <span className={`crm-pill ${canva ? "ok" : ""}`}>Canva {canva ? "connected" : "not connected"}</span>
        <span style={{ color: "var(--mut)", fontSize: 12 }}>Import brand files and designs into the library.</span>
        <button className="crm-b" style={{ marginLeft: "auto" }} onClick={() => setShowUpload(true)}>+ Upload file</button>
      </div>

      <div className="crm-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 18 }}>
        <div className="crm-card">
          <h3>Brand colours <span style={{ color: "var(--mut)", fontSize: 12, fontWeight: 400 }}>Click to copy</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {BRAND_COLOURS.map((c) => (
              <button key={c.hex} onClick={() => copyHex(c.hex)}
                style={{
                  height: 64, borderRadius: 12, border: "1px solid var(--line)", cursor: "pointer",
                  background: c.hex, color: c.hex === "#efe8f8" ? "#17121f" : "#fff",
                  display: "flex", alignItems: "flex-end", padding: "6px 8px", fontSize: 11, fontWeight: 700,
                  textAlign: "left", flexDirection: "column", justifyContent: "space-between",
                }}>
                <span>{c.name}</span>
                <span>{c.hex}{copied === c.hex ? " ✓" : ""}</span>
              </button>
            ))}
          </div>
          {colours.length > 0 && (
            <>
              <p style={{ color: "var(--mut)", fontSize: 13, margin: "16px 0 8px" }}>Custom colours</p>
              {colours.map((c) => (
                <div className="crm-row" key={c.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: c.url_or_value }} />
                  <div style={{ flex: 1 }}>{c.name} <code>{c.url_or_value}</code></div>
                  <button className="crm-b crm-b--d" onClick={() => removeAsset(c)}>×</button>
                </div>
              ))}
            </>
          )}
          <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 18, fontWeight: 600 }}>Fonts</p>
          <p style={{ fontFamily: "'Barlow Condensed', Arial", fontSize: 28, margin: 0 }}>
            Barlow Condensed <span style={{ fontFamily: "Inter", fontSize: 16 }}>+ Inter</span>
          </p>
        </div>

        <div className="crm-card">
          <h3>Brand guidelines</h3>
          <div className="crm-row" style={{ padding: "10px 0", borderTop: 0 }}>
            <div style={{ flex: 1 }}>
              <b>Tone of voice</b>
              <div style={{ color: "var(--mut)", fontSize: 13 }}>Clear, confident, practical. No jargon.</div>
            </div>
          </div>
          <div className="crm-row" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: 1 }}>
              <b>Logo usage</b>
              <div style={{ color: "var(--mut)", fontSize: 13 }}>Keep clear space equal to the "P" height.</div>
            </div>
          </div>
          <div className="crm-row" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ flex: 1 }}>
              <b>Don'ts</b>
              <div style={{ color: "var(--mut)", fontSize: 13 }}>Stretch the logo or use off-palette purples.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-card">
        <h3>Files</h3>
        {files.length === 0 ? (
          <div className="crm-empty">No files yet. Upload your first brand file.</div>
        ) : files.map((f) => (
          <div className="crm-row" key={f.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <b>{f.name}</b>
              {f.category && <span style={{ color: "var(--mut)", fontSize: 12 }}> · {f.category}</span>}
            </div>
            <SignedLink fileUri={f.url_or_value} filename={f.name} />
            <button className="crm-b crm-b--d" style={{ marginLeft: 8 }} onClick={() => removeAsset(f)}>×</button>
          </div>
        ))}
      </div>

      {showUpload && (
        <Modal title="Upload file" onClose={() => setShowUpload(false)} onSave={upload} saving={saving}>
          <ModalField label="File name" required><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></ModalField>
          <FileUpload label="File" value={form.url_or_value} onChange={(v) => setForm({ ...form, url_or_value: v })} />
          <ModalField label="Category"><input className={inputClass} placeholder="e.g. Logos, Templates" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></ModalField>
        </Modal>
      )}
    </>
  );
}
