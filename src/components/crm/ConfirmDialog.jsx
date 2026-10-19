import Modal from "@/components/crm/Modal";

export default function ConfirmDialog({ title = "Confirm", message, onConfirm, onCancel, confirmLabel = "Delete", danger = true }) {
  return (
    <Modal title={title} onClose={onCancel} saveLabel={confirmLabel} onSave={onConfirm}>
      <p style={{ color: "var(--mut)", margin: "0 0 4px" }}>{message}</p>
    </Modal>
  );
}