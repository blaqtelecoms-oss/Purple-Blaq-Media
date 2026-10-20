import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createRecord, listRecords } from "@/api/data";
import { useCrm } from "@/lib/CrmContext";
import { formatZAR, projectProgress, canAccess, canEditProjects, PROJECT_TYPES } from "@/lib/crmConstants";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";
import FileUpload from "@/components/crm/FileUpload";
import { SignedImage } from "@/components/crm/SignedFile";

const HERO_BG = "/assets/media/51eafadb2_generated_b34084e8.jpg";

export default function Projects() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showAddKind, setShowAddKind] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addKind, setAddKind] = useState("client");
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        listRecords("projects"),
        listRecords("clients"),
      ]);
      setProjects(p);
      setClients(c);
      setLoadError("");
    } catch (error) {
      setProjects([]);
      setLoadError(error.message || "Could not load projects.");
    }
  }, []);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "projects")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canEdit = canEditProjects(member?.role);

  const startAdd = (kind) => {
    setAddKind(kind);
    setForm({ name: "", type: "Website", description: "", image: "", goals: "", tasks: "", budget: 0, client_id: "", platform: "", workspace_name: "", app_url: "" });
    setShowAddKind(false);
    setShowAddForm(true);
  };

  const validate = () => {
    const er = {};
    if (!form.name?.trim()) er.name = "Project name is required";
    if (addKind === "client" && !form.client_id) er.client_id = "Select a client";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const tasks = (form.tasks || "")
        .split("\n")
        .filter((x) => x.trim())
        .map((x) => ({ title: x.trim(), done: false }));
      await createRecord("projects", {
        name: form.name,
        kind: addKind,
        client_id: addKind === "client" ? form.client_id : "",
        type: form.type,
        description: form.description,
        image: form.image,
        goals: form.goals,
        tasks,
        budget: Number(form.budget) || 0,
        spent: 0,
        platform: form.platform || "",
        workspace_name: form.workspace_name || "",
        app_url: form.app_url || "",
      });
      setShowAddForm(false);
      await load();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  if (projects === null) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  const filtered = projects.filter((p) => filter === "All" || (filter === "Client" ? p.kind === "client" : p.kind === "internal"));

  return (
    <>
      <div className="pbp-hero">
        <img className="pbp-hero__bg" src={HERO_BG} alt="" />
        <div className="pbp-hero__scr" />
        <div className="pbp-hero__in">
          <h1 className="pbp-h1">Project <em>management</em></h1>
          {canEdit && (
            <button className="pbp-btn" onClick={() => setShowAddKind(true)}>+ Add project</button>
          )}
        </div>
      </div>

      <div className="pbp-chips">
        {["All", "Client", "Internal"].map((x) => (
          <button key={x} className={`pbp-chip ${filter === x ? "on" : ""}`} onClick={() => setFilter(x)}>
            {x}
          </button>
        ))}
      </div>
      {loadError && <p role="alert" className="crm-field-err">{loadError}</p>}

      {filtered.length === 0 ? (
        <div className="pbp-empty">No projects yet, add your first project.</div>
      ) : (
        <div className="pbp-grid">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="pbp-card"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              tabIndex={0}
              onClick={() => navigate(`/admin/projects/${p.id}`)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/admin/projects/${p.id}`)}
            >
              <div className="pbp-th">
                {p.image && <SignedImage fileUri={p.image} alt={p.name} className="" bucketName="project-images" fallbackBucketName="crm-files" />}
              </div>
              <div className="pbp-pills">
                <span className="pbp-pill">{p.type}</span>
                <span className="pbp-pill pbp-pill--in">{p.kind === "client" ? "Client" : "Internal"}</span>
              </div>
              <b>{p.name}</b>
              <p className="pbp-one">{p.description || "—"}</p>
              {(p.platform || p.workspace_name || p.app_url || p.workspace_url) && (
                <div className="pbp-pills">
                  {p.platform && <span className="pbp-pill">{p.platform}</span>}
                  {p.workspace_name && <span className="pbp-pill">{p.workspace_name}</span>}
                  {(p.app_url || p.workspace_url) && (
                    <a
                      href={p.app_url || p.workspace_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="pbp-pill pbp-pill--lk"
                    >
                      Open app ↗
                    </a>
                  )}
                </div>
              )}
              <div className="pbp-sep">
                <div className="pbp-row">
                  <span>{projectProgress(p)}% complete</span>
                  <span>{formatZAR(p.budget)}</span>
                </div>
                <div className="pbp-prog">
                  <i style={{ width: projectProgress(p) + "%" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddKind && (
        <Modal title="New project" onClose={() => setShowAddKind(false)} onSave={() => {}} saveLabel="">
          <p style={{ color: "var(--mut)", margin: "0 0 14px" }}>Who is this project for?</p>
          <div className="crm-ch">
            <button type="button" onClick={() => startAdd("client")}>Client project</button>
            <button type="button" onClick={() => startAdd("internal")}>Internal project</button>
          </div>
        </Modal>
      )}

      {showAddForm && (
        <Modal title={addKind === "client" ? "Client project" : "Internal project"} onClose={() => setShowAddForm(false)} onSave={handleSave} saving={saving}>
          {addKind === "client" && (
            <ModalField label="Client" required error={errors.client_id}>
              <select className={inputClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </ModalField>
          )}
          <ModalField label="Project name" required error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </ModalField>
          <ModalField label="Type">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Scope / description">
            <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </ModalField>
          <FileUpload label="Project image" accept="image/*" value={form.image} onChange={(v) => setForm({ ...form, image: v })} bucketName="project-images" />
          <ModalField label="Goals (one per line)">
            <textarea className={inputClass} rows={3} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
          </ModalField>
          <ModalField label="Tasks (one per line)">
            <textarea className={inputClass} rows={3} value={form.tasks} onChange={(e) => setForm({ ...form, tasks: e.target.value })} />
          </ModalField>
          <ModalField label="Budget (R)">
            <input className={inputClass} type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </ModalField>
          <ModalField label="Platform">
            <select className={inputClass} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="">Select a platform…</option>
              <option value="Supabase">Supabase</option>
              <option value="GitHub">GitHub</option>
              <option value="Other">Other</option>
            </select>
          </ModalField>
          <ModalField label="Workspace name">
            <input className={inputClass} value={form.workspace_name} onChange={(e) => setForm({ ...form, workspace_name: e.target.value })} placeholder="e.g. my-team" />
          </ModalField>
          <ModalField label="App URL">
            <input className={inputClass} type="url" value={form.app_url} onChange={(e) => setForm({ ...form, app_url: e.target.value })} placeholder="https://your-app.example.com" />
          </ModalField>
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}
    </>
  );
}