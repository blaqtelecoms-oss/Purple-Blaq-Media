import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRecords, updateRecord } from "@/api/data";
import { useSeo } from "@/hooks/useSeo";
import { LOGO_URL } from "@/lib/pbConstants";

const STATUSES = ["New", "Contacted", "Closed"];

const STATUS_STYLE = {
  New: { background: "#5a1a8c", color: "#fff" },
  Contacted: { background: "#f5f1fa", color: "#652991", border: "1px solid #e6e0ee" },
  Closed: { background: "#16121c", color: "#fff" },
};

export default function AdminEnquiries() {
  useSeo("Admin · Enquiries | Purple Blaq Media", "Manage enquiries.");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listRecords("enquiries", { orderBy: "created_date", ascending: false, limit: 200 });
      setItems(list);
    } catch (e) {
      setError(e?.message || "Failed to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id, status) => {
    try {
      await updateRecord("enquiries", id, { status });
      setItems((arr) => arr.map((it) => (it.id === id ? { ...it, status } : it)));
    } catch (e) {
      setError(e?.message || "Failed to update status.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5fb", color: "var(--ink)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 5vw",
          background: "#fff",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={LOGO_URL} alt="Purple Blaq Media" style={{ height: 38 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Enquiries</span>
        </div>
        <Link to="/" className="pb-btn ghost" style={{ padding: "10px 20px" }}>
          View site
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 5vw" }}>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', Arial, sans-serif",
            textTransform: "uppercase",
            fontSize: 40,
            margin: "0 0 8px",
          }}
        >
          Enquiries
        </h1>
        <p style={{ color: "var(--mut)", margin: "0 0 28px" }}>
          Newest first. Change a status to keep track of follow-ups.
        </p>

        {error && (
          <p style={{ color: "#dc2626", marginBottom: 16 }}>{error}</p>
        )}

        {loading ? (
          <p style={{ color: "var(--mut)" }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: "var(--mut)" }}>No enquiries yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>
                      {it.full_name}
                    </div>
                    <div style={{ color: "var(--mut)", fontSize: 14, marginTop: 2 }}>
                      {it.email}
                      {it.phone ? `  ·  ${it.phone}` : ""}
                      {it.company ? `  ·  ${it.company}` : ""}
                    </div>
                    <div style={{ color: "var(--p2)", fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                      {it.enquiry_type || "—"}
                    </div>
                    <div style={{ color: "var(--mut)", fontSize: 12, marginTop: 4 }}>
                      {new Date(it.created_date).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeStatus(it.id, s)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          border:
                            it.status === s
                              ? "none"
                              : "1px solid var(--line)",
                          background:
                            it.status === s
                              ? STATUS_STYLE[s].background
                              : "#fff",
                          color:
                            it.status === s ? STATUS_STYLE[s].color : "var(--mut)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {it.message && (
                  <>
                    <button
                      onClick={() => setOpenId(openId === it.id ? null : it.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--p)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "8px 0 0",
                      }}
                    >
                      {openId === it.id ? "Hide message" : "Show message"}
                    </button>
                    {openId === it.id && (
                      <p
                        style={{
                          marginTop: 8,
                          padding: 14,
                          background: "var(--soft)",
                          borderRadius: 10,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "var(--ink)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {it.message}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}