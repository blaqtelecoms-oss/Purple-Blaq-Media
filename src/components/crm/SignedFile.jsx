import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useSignedUrl(fileUri) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!fileUri) return;
    let active = true;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri })
      .then(({ signed_url }) => active && setUrl(signed_url))
      .catch(() => {});
    return () => { active = false; };
  }, [fileUri]);
  return url;
}

export function SignedImage({ fileUri, alt = "", className = "" }) {
  const url = useSignedUrl(fileUri);
  if (!url) return <div className={className} style={{ background: "var(--soft)" }} />;
  return <img src={url} alt={alt} className={className} />;
}

export function SignedLink({ fileUri, filename, className = "" }) {
  const url = useSignedUrl(fileUri);
  if (!url) return <span className={className} style={{ color: "var(--mut)" }}>None</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className={className} style={{ color: "var(--p)", fontWeight: 600 }}>
      {filename?.slice(0, 16) || "View file"}
    </a>
  );
}