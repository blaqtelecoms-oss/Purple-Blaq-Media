import { useCallback, useEffect, useState } from "react";
import { listRecords } from "@/api/data";

const TABLES = [
  "marketing_leads", "campaigns", "content_items", "email_messages",
  "email_campaigns", "marketing_tasks", "brand_assets", "testimonials",
  "competitors", "marketing_budgets", "integration_connections",
  "clients", "projects",
];

export function useMarketingData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const entries = await Promise.all(
        TABLES.map((t) => listRecords(t, { orderBy: "created_date", ascending: false }).catch(() => []))
      );
      const result = {};
      TABLES.forEach((t, i) => { result[t] = entries[i]; });
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load marketing data.");
      setData(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, error, reload: load };
}
