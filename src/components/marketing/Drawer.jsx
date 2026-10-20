import { useEffect } from "react";

export default function Drawer({ title, subtitle, onClose, children, footer }) {
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
      <div className="crm-dr" onClick={(e) => e.stopPropagation()}>
        <div className="crm-top" style={{ marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 28 }}>{title}</h1>
            {subtitle && <div className="crm-sub">{subtitle}</div>}
          </div>
          <button className="crm-b crm-b--g" onClick={onClose}>Close</button>
        </div>
        {children}
        {footer && <div className="crm-ac" style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}
