import type { ReactNode } from "react";

interface DealSectionProps {
  title?: string;
  logo?: ReactNode;
  badge?: string;
  badgeColor?: "green" | "dim";
  children: ReactNode;
}

const badgeStyles: Record<string, React.CSSProperties> = {
  green: { background: "var(--green)", color: "#000" },
  dim: { background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" },
};

export function DealSection({ title, logo, badge, badgeColor = "dim", children }: DealSectionProps) {
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
        {logo}
        {title && (
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {title}
          </h2>
        )}
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.07em", padding: "2px 7px", borderRadius: 4,
            ...badgeStyles[badgeColor],
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarWidth: "none",
      }}>
        {children}
      </div>
    </section>
  );
}
