import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { deleteRecord, listRecords, updateRecord } from "@/api/data";
import { supabase } from "@/utils/supabase";
import { useCrm } from "@/lib/CrmContext";
import { ROLES, initials, canAccess, canManageTeam } from "@/lib/crmConstants";
import CrmPageHeader from "@/components/crm/CrmPageHeader";
import Modal, { ModalField, inputClass } from "@/components/crm/Modal";
import ConfirmDialog from "@/components/crm/ConfirmDialog";

export default function Team() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ full_name: "", email: "", job_title: "", role: "Development" });
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeam(await listRecords("team_members"));
      setLoadError("");
    } catch (error) {
      setTeam([]);
      setLoadError(error.message || "Could not load team members.");
    }
  }, []);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "team")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canManage = canManageTeam(member?.role);

  const changeRole = async (id, role) => {
    try {
      await updateRecord("team_members", id, { role });
      await load();
    } catch (error) {
      setLoadError(error.message || "Could not update the team role.");
    }
  };

  const validate = () => {
    const er = {};
    if (!form.full_name.trim()) er.full_name = "Name is required";
    if (!form.email.trim()) er.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "Invalid email";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("invite-team-member", {
        body: { ...form, email: form.email.toLowerCase() },
      });
      if (error) throw error;
      setShowAdd(false);
      setForm({ full_name: "", email: "", job_title: "", role: "Development" });
      await load();
    } catch (err) {
      setErrors((e) => ({ ...e, submit: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = team.find((m) => m.id === deleteId);
    if (target?.role === "Admin" && team.filter((m) => m.role === "Admin").length <= 1) {
      setDeleteId(null);
      return;
    }
    try {
      await deleteRecord("team_members", deleteId);
      setDeleteId(null);
      await load();
    } catch (error) {
      setLoadError(error.message || "Could not remove the team member.");
    }
  };

  if (team === null) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  const filtered = team.filter((m) => filter === "All" || m.role === filter);

  return (
    <>
      <CrmPageHeader
        title="Our"
        em="team"
        action={canManage}
        actionLabel="+ Add member"
        onAction={() => setShowAdd(true)}
      />
      {loadError && <p role="alert" className="crm-field-err">{loadError}</p>}
      <div className="crm-chips">
        {["All", ...ROLES].map((x) => (
          <button key={x} className={filter === x ? "on" : ""} onClick={() => setFilter(x)}>
            {x} {x === "All" ? team.length : team.filter((m) => m.role === x).length}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="crm-empty">No team members in this category.</div>
      ) : (
        <div className="crm-card crm-sc">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Title</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="crm-row">
                      <div className="crm-av crm-av--r">{initials(m.full_name)}</div>
                      <div>
                        <b>{m.full_name}</b>
                        <br />
                        <small style={{ color: "var(--mut)" }}>{m.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{m.job_title || "—"}</td>
                  <td>
                    <select
                      className="crm-role-select"
                      value={m.role}
                      disabled={!canManage}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="crm-r">
                    {canManage && (
                      <button className="crm-b crm-b--d" onClick={() => setDeleteId(m.id)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add team member" onClose={() => setShowAdd(false)} onSave={handleSave} saving={saving}>
          <ModalField label="Full name" required error={errors.full_name}>
            <input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </ModalField>
          <ModalField label="Email" required error={errors.email}>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </ModalField>
          <ModalField label="Job title">
            <input className={inputClass} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
          </ModalField>
          <ModalField label="Role">
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </ModalField>
          {errors.submit && <span className="crm-field-err">{errors.submit}</span>}
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          message={
            team.find((m) => m.id === deleteId)?.role === "Admin" &&
            team.filter((m) => m.role === "Admin").length <= 1
              ? "Cannot remove the last Admin."
              : "Remove this team member?"
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          confirmLabel={
            team.find((m) => m.id === deleteId)?.role === "Admin" &&
            team.filter((m) => m.role === "Admin").length <= 1
              ? "OK"
              : "Remove"
          }
        />
      )}
    </>
  );
}