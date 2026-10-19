export default function CrmPageHeader({ title, em, action, actionLabel, onAction, actionDisabled }) {
  return (
    <div className="crm-top">
      <div>
        <h1>
          {title} <em>{em}</em>
        </h1>
        <div className="crm-sub">Purple Blaq Media · Technology. Workflow. Digital Solutions.</div>
      </div>
      {action && (
        <button className="crm-b" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}