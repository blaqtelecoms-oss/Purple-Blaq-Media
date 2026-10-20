import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Outlet } from "react-router-dom";
import { CrmProvider, useCrm } from "@/lib/CrmContext";
import CrmSidebar from "@/components/crm/CrmSidebar";

function CrmShell() {
  const { member, loading, denied, error, checkAccess } = useCrm();
  const { logout } = useAuth();

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex,nofollow");
    document.title = "Admin CRM | Purple Blaq Media";
    return () => {
      meta.setAttribute("content", "index,follow");
    };
  }, []);

  if (loading) {
    return (
      <div className="crm-loading">
        <div className="crm-spinner" />
      </div>
    );
  }
  if (denied || !member) {
    return (
      <div className="crm-empty" role="alert">
        {error ? `Could not verify admin access: ${error}` : "This account does not have admin access."}
        <button className="crm-b crm-b--g" onClick={checkAccess}>
          Retry access check
        </button>
        <button className="crm-b" onClick={() => logout().then(() => { window.location.href = "/login"; }).catch((signOutError) => console.error("Sign-out failed:", signOutError))}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="crm-app">
      <CrmSidebar />
      <main className="crm-main">
        <Outlet />
      </main>
    </div>
  );
}

export default function CrmLayout() {
  return (
    <CrmProvider>
      <CrmShell />
    </CrmProvider>
  );
}