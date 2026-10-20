import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createRecord, deleteRecord, listRecords } from "@/api/data";
import { useCrm } from "@/lib/CrmContext";
import { initials, canAccess, canEditClients } from "@/lib/crmConstants";
import CrmPageHeader from "@/components/crm/CrmPageHeader";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";
import ConfirmDialog from "@/components/crm/ConfirmDialog";
import FileUpload from "@/components/crm/FileUpload";
import { SignedImage } from "@/components/crm/SignedFile";

export default function Clients() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ company_name: "", logo: "", description: "", contact_person: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        listRecords("clients"),
        listRecords("projects"),
      ]);
      setClients(c);
      setProjects(p);
      setLoadError("");
    } catch (error) {
      setClients([]);
      setLoadError(error.message || "Could not load clients.");
    }
  }, []);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "clients")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canEdit = canEditClients(member?.role);

  const validate = () => {
    const er = {};
    if (!form.company_name.trim()) er.company_name = "Company name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "Invalid email";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createRecord("clients", form);
      setShowAdd(false);
      setForm({ company_name: "", logo: "", description: "", contact_person: "", email: "", phone: "" });
      await load();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecord("clients", deleteId);
      setDeleteId(null);
      await load();
    } catch (error) {
      setLoadError(error.message || "Could not delete the client.");
    }
  };

  if (clients === null) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  return (
    <>
      <CrmPageHeader
        title="Our"
        em="clients"
        action={canEdit}
        actionLabel="+ Add client"
        onAction={() => setShowAdd(true)}
      />
      {loadError && <p role="alert" className="crm-field-err">{loadError}</p>}
      {clients.length === 0 ? (
        <div className="crm-empty">No clients yet, add your first client.</div>
      ) : (
        <div className="crm-grid crm-k3">
          {clients.map((c) => (
            <div key={c.id} className="crm-card crm-card--h">
              <div className="crm-row">
                {c.logo ? (
                  <SignedImage fileUri={c.logo} alt={c.company_name} className="crm-av" bucketName="company-logos" fallbackBucketName="crm-files" />
                ) : (
                  <div className="crm-av">{initials(c.company_name)}</div>
                )}
                <div>
                  <b>{c.company_name}</b>
                  <br />
                  <small style={{ color: "var(--mut)" }}>
                    {projects.filter((p) => p.client_id === c.id).length} project(s)
                  </small>
                </div>
              </div>
              <p style={{ color: "var(--mut)", margin: "12px 0" }}>{c.description || "—"}</p>
              <small>
                {c.contact_person || "—"}
                <br />
                {c.email || "—"}
                <br />
                {c.phone || "—"}
              </small>
              <div className="crm-row crm-sp" style={{ marginTop: 14 }}>
                <span className="crm-pill">Client</span>
                {canEdit && (
                  <button className="crm-b crm-b--d" onClick={() => setDeleteId(c.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add client" onClose={() => setShowAdd(false)} onSave={handleSave} saving={saving}>
          <ModalField label="Company name" required error={errors.company_name}>
            <input className={inputClass} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </ModalField>
          <FileUpload label="Logo" accept="image/*" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} bucketName="company-logos" />
          <ModalField label="Description">
            <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </ModalField>
          <ModalField label="Contact person">
            <input className={inputClass} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </ModalField>
          <ModalField label="Email" error={errors.email}>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </ModalField>
          <ModalField label="Phone">
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </ModalField>
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Delete this client? Their projects will remain but show 'Client removed'."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  );
}