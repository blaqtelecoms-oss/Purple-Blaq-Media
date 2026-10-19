import { useEffect } from "react";

export default function Modal({ title, children, onClose, onSave, saveLabel = "Save", saving = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="crm-mo" onClick={onClose}>
      <form
        className="crm-md"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave?.();
        }}
      >
        <h3>{title}</h3>
        {children}
        <div className="crm-ac">
          <button type="button" className="crm-b crm-b--g" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="crm-b" disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ModalField({ label, children, required, error }) {
  return (
    <label className="crm-field">
      {label} {required && <span style={{ color: "var(--p)" }}>*</span>}
      {children}
      {error && <span className="crm-field-err">{error}</span>}
    </label>
  );
}

export const inputClass = "crm-input";