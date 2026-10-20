import { useState } from "react";
import { supabase } from "@/utils/supabase";

const MAX_SIZE = 10 * 1024 * 1024;

/**
 * @param {{ label: string, accept?: string, value?: string | null, onChange: (path: string) => void, onError?: (message: string) => void, bucketName?: string }} props
 */
export default function FileUpload({
  label,
  accept = "image/*",
  value,
  onChange,
  onError,
  bucketName = "crm-files",
}) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sign in before uploading files.");
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${filename}`;
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      onChange(data.path);
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