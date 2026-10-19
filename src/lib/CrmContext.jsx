import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CrmContext = createContext(null);

export function CrmProvider({ children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const checkAccess = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    try {
      const res = await base44.functions.invoke("crmAccess", {});
      const data = res.data;
      if (!data || !data.authenticated || !data.member) {
        setMember(null);
        setDenied(true);
      } else {
        setMember(data.member);
      }
    } catch {
      setMember(null);
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return (
    <CrmContext.Provider value={{ member, loading, denied, checkAccess }}>
      {children}
    </CrmContext.Provider>
  );
}

export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
};