import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/lib/AuthContext";

const CrmContext = createContext(null);

export function CrmProvider({ children }) {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  const checkAccess = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    setError("");

    if (!user?.email) {
      setMember(null);
      setDenied(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from("team_members")
        .select("*")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (queryError) throw queryError;
      if (!data) {
        setMember(null);
        setDenied(true);
      } else {
        setMember(data);
      }
    } catch (queryError) {
      setMember(null);
      setDenied(true);
      setError(queryError.message || "Could not verify admin access.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return (
    <CrmContext.Provider value={{ member, loading, denied, error, checkAccess }}>
      {children}
    </CrmContext.Provider>
  );
}

export const useCrm = () => {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
};
