import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export function useSignedUrl(fileUri, bucketName = "crm-files", fallbackBucketName) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!fileUri) return;
    let active = true;
    setUrl("");
    setError("");
    if (fileUri.startsWith("/assets/media/")) {
      setUrl(fileUri);
      return () => { active = false; };
    }
    const bucketNames = fallbackBucketName && fallbackBucketName !== bucketName
      ? [bucketName, fallbackBucketName]
      : [bucketName];
    const createSignedUrl = async () => {
      let lastError;
      for (const name of bucketNames) {
        const { data, error: signedUrlError } = await supabase.storage
          .from(name)
          .createSignedUrl(fileUri, 3600);
        if (!signedUrlError) {
          if (active) setUrl(data.signedUrl);
          return;
        }
        lastError = signedUrlError;
      }
      throw lastError;
    };
    createSignedUrl()
      .catch((signedUrlError) => {
        if (!active) return;
        setError(signedUrlError?.message || "Could not open the stored file.");
      });
    return () => { active = false; };
  }, [fileUri, bucketName, fallbackBucketName]);
  return { url, error };
}

export function SignedImage({
  fileUri,
  alt = "",
  className = "",
  bucketName = "crm-files",
  fallbackBucketName,
}) {
  const { url, error } = useSignedUrl(fileUri, bucketName, fallbackBucketName);
  if (!url) return <div className={className} role={error ? "alert" : undefined} title={error} style={{ background: "var(--soft)" }} />;
  return <img src={url} alt={alt} className={className} />;
}

export function SignedLink({ fileUri, filename, className = "" }) {
  const { url, error } = useSignedUrl(fileUri);
  if (!url) return <span className={className} role={error ? "alert" : undefined} title={error} style={{ color: "var(--mut)" }}>{error ? "Unavailable" : "None"}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className} style={{ color: "var(--p)", fontWeight: 600 }}>
      {filename?.slice(0, 16) || "View file"}
    </a>
  );
}