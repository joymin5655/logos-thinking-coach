import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useT } from "@/i18n";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const t = useT("notFound");

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--l-bg)",
        color: "var(--l-fg)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 512,
          margin: "0 16px",
          padding: "40px 32px",
          textAlign: "center",
          backgroundColor: "var(--l-panel)",
          border: "1px solid var(--l-border-mid)",
        }}
      >
        <AlertCircle size={56} style={{ color: "var(--l-error)", margin: "0 auto 24px" }} />
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 40, fontWeight: 700, margin: "0 0 8px" }}>404</h1>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px", color: "var(--l-fg-mid)" }}>{t("title")}</h2>
        <p style={{ fontSize: 13, lineHeight: 1.8, margin: "0 0 32px", color: "var(--l-fg-mid)" }}>
          {t("body1")}
          <br />
          {t("body2")}
        </p>
        <button
          type="button"
          onClick={() => setLocation("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 22px",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--l-on-fg)",
            backgroundColor: "var(--l-fg)",
            border: "1px solid var(--l-fg)",
            cursor: "pointer",
          }}
        >
          <Home size={14} />
          {t("home")}
        </button>
      </div>
    </div>
  );
}
