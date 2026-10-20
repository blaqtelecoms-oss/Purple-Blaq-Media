import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteRecord, getRecord, listRecords, updateRecord } from "@/api/data";
import { useCrm } from "@/lib/CrmContext";
import { formatZAR, projectProgress, canAccess, canEditProjects } from "@/lib/crmConstants";
import ConfirmDialog from "@/components/crm/ConfirmDialog";

export default function ProjectDetail() {
  const { member } = useCrm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [clients, setClients] = useState([]);
  const [spent, setSpent] = useState(0);
  const [savingSpent, setSavingSpent] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        getRecord("projects", id),
        listRecords("clients"),
      ]);
      setProject(p);
      setSpent(p.spent || 0);
      setClients(c);
      setNotFound(false);
      setLoadError("");
    } catch (error) {
      if (error.code === "PGRST116") setNotFound(true);
      else setLoadError(error.message || "Could not load the project.");
    }
  }, [id]);

  useEffect(() => {
    if (!member) return;
    if (!canAccess(member.role, "projects")) {
      navigate("/admin", { replace: true });
      return;
    }
    load();
  }, [member, navigate, load]);

  const canEdit = canEditProjects(member?.role);
  const clientName = (cid) => clients.find((c) => c.id === cid)?.company_name || "Client removed";

  const toggleTask = async (idx) => {
    setToggling(idx);
    try {
      const tasks = project.tasks.map((t, i) => (i === idx ? { ...t, done: !t.done } : t));
      await updateRecord("projects", project.id, { tasks });
      await load();
    } catch (error) {
      setLoadError(error.message || "Could not update the task.");
    } finally {
      setToggling(null);
    }
  };

  const saveSpent = async () => {
    setSavingSpent(true);
    try {
      await updateRecord("projects", project.id, { spent: Number(spent) || 0 });
      await load();
    } catch (error) {
      setLoadError(error.message || "Could not update project spending.");
    } finally {
      setSavingSpent(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecord("projects", project.id);
      navigate("/admin/projects");
    } catch (error) {
      setLoadError(error.message || "Could not delete the project.");
    }
  };

  if (notFound) return <div className="pbp-empty">Project not found.</div>;
  if (!project) return <div className="crm-loading"><div className="crm-spinner" /></div>;

  const pc = projectProgress(project);
  const used = project.budget ? Math.round((project.spent / project.budget) * 100) : 0;
  const goals = (project.goals || "").split("\n").filter(Boolean);
  const doneTasks = project.tasks?.filter((t) => t.done).length || 0;

  return (
    <>
      <div className="pbp-detail">
        {loadError && <p role="alert" className="crm-field-err">{loadError}</p>}
        <div className="pbp-dh">
          <span className="pbp-pill">
            {project.kind === "client" ? clientName(project.client_id) : "Internal"} · {project.type}
          </span>
          <button className="pbp-btn pbp-btn--o" onClick={() => navigate("/admin/projects")}>Close</button>
        </div>

        <h2>{project.name}</h2>
        <p className="pbp-desc">{project.description || "—"}</p>

        {(project.platform || project.workspace_name || project.app_url || project.workspace_url) && (
          <div className="pbp-meta">
            {project.platform && <span className="pbp-pill">{project.platform}</span>}
            {project.workspace_name && <span className="pbp-pill">{project.workspace_name}</span>}
            {(project.app_url || project.workspace_url) && (
              <a href={project.app_url || project.workspace_url} target="_blank" rel="noreferrer" className="pbp-pill pbp-pill--lk">
                Open app ↗
              </a>
            )}
          </div>
        )}

        <div className="pbp-two">
          <div className="pbp-pn">
            <h3>Overview</h3>
            <div className="pbp-bud">
              <div className="pbp-ring" style={{ background: `conic-gradient(#512477 ${pc * 3.6}deg, #eee8f5 0)` }}>
                <b>{pc}%</b>
              </div>
              <div className="pbp-bud-t">
                <span>Budget used: {formatZAR(project.spent)} of {formatZAR(project.budget)} ({used}%)</span>
                <div className="pbp-prog">
                  <i style={{ width: Math.min(used, 100) + "%" }} />
                </div>
                <span>{doneTasks} of {project.tasks?.length || 0} tasks done</span>
              </div>
            </div>
          </div>

          <div className="pbp-pn">
            <h3>Budget</h3>
            {canEdit ? (
              <div className="pbp-sp">
                <label>
                  Spent (R)
                  <input className="pbp-inp" type="number" min="0" value={spent} onChange={(e) => setSpent(e.target.value)} />
                </label>
                <button className="pbp-btn" onClick={saveSpent} disabled={savingSpent}>
                  {savingSpent ? "…" : "Save"}
                </button>
              </div>
            ) : (
              <p className="pbp-desc">Spent: {formatZAR(project.spent)} of {formatZAR(project.budget)}</p>
            )}
          </div>
        </div>

        <div className="pbp-cols">
          <div className="pbp-pn">
            <h3>Goals</h3>
            {goals.length > 0 ? (
              goals.map((g, i) => <div key={i} className="pbp-li">• {g}</div>)
            ) : (
              <div className="pbp-none">None set</div>
            )}
          </div>
          <div className="pbp-pn">
            <h3>Tasks</h3>
            {project.tasks?.length ? (
              project.tasks.map((t, i) => (
                <label key={i} className={`pbp-tk ${t.done ? "done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    disabled={!canEdit || toggling === i}
                    onChange={() => toggleTask(i)}
                  />
                  <span>{t.title}</span>
                </label>
              ))
            ) : (
              <div className="pbp-none">No tasks</div>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="pbp-foot">
            <button className="pbp-btn pbp-btn--d" onClick={() => setConfirmDelete(true)}>Delete project</button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this project? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}