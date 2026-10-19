import { useState } from "react";
import { base44 } from "@/api/base44Client";

const MAX_SIZE = 10 * 1024 * 1024;

export default function FileUpload({ label, accept = "image/*", value, onChange, onError }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_SIZE) {
      const msg = "File must be under 10MB.";
      setError(msg);
      onError?.(msg);
      return;
    }
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      onChange(file_uri);
    } catch (err) {
      const msg = err?.message || "Upload failed.";
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className="crm-field">
      {label}
      <div className="crm-upload">
        <input type="file" accept={accept} onChange={handleFile} disabled={uploading} />
        <span className="crm-upload-label">
          {uploading ? "Uploading…" : value ? "File attached ✓" : "Choose a file…"}
        </span>
      </div>
      {error && <span className="crm-field-err">{error}</span>}
    </label>
  );
}