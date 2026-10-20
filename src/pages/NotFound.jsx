import { Link } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";
import { LOGO_URL } from "@/lib/pbConstants";

export default function NotFound() {
  useSeo(
    "Page not found | Purple Blaq Media",
    "The page you were looking for could not be found.",
    { robots: "noindex,follow" }
  );
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 5vw",
        background: "#fff",
      }}
    >
      <img src={LOGO_URL} alt="Purple Blaq Media" style={{ height: 56, marginBottom: 28 }} />
      <h1
        style={{
          fontFamily: "'Barlow Condensed', Arial, sans-serif",
          fontSize: "clamp(80px, 18vw, 160px)",
          lineHeight: 0.9,
          textTransform: "uppercase",
          margin: 0,
          color: "var(--p2)",
        }}
      >
        404
      </h1>
      <p
        style={{
          fontFamily: "'Barlow Condensed', Arial, sans-serif",
          textTransform: "uppercase",
          fontSize: 28,
          margin: "12px 0 8px",
        }}
      >
        Page not found
      </p>
      <p style={{ color: "var(--mut)", maxWidth: 420, margin: "0 0 28px" }}>
        The page you were looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="pb-btn">
        Back to Home
      </Link>
    </div>
  );
}