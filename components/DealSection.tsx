import type { ReactNode } from "react";

interface DealSectionProps {
  title?: string;
  logo?: ReactNode;
  badge?: string;
  badgeColor?: "green" | "orange" | "dim";
  minCardWidth?: number;
  children: ReactNode;
}

const badgeStyles: Record<string, React.CSSProperties> = {
  green: { background: "var(--green)", color: "#000" },
  orange: { background: "var(--orange)", color: "#000" },
  dim: { background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" },
};

export function DealSection({ title, logo, badge, badgeColor = "dim", minCardWidth = 130, children }: DealSectionProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {logo}
        {title && <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</h2>}
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
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
        gap: 10,
      }}>
        {children}
      </div>
    </section>
  );
}
