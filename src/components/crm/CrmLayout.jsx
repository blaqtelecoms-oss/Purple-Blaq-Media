import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CrmProvider, useCrm } from "@/lib/CrmContext";
import CrmSidebar from "@/components/crm/CrmSidebar";

function CrmShell() {
  const { member, loading, denied } = useCrm();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (denied || !member) {
      window.location.href = "/login";
    }
  }, [loading, denied, member]);

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
  if (denied || !member) return null;

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