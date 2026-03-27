"use client";

import { useRef, useState, type ReactNode } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  }

  const arrowBtn = (dir: "left" | "right", visible: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 8,
    [dir]: 0,
    width: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 10,
    border: "none",
    background: dir === "right"
      ? "linear-gradient(to left, rgba(10,15,25,0.65) 0%, transparent 100%)"
      : "linear-gradient(to right, rgba(10,15,25,0.65) 0%, transparent 100%)",
    padding: 0,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.2s",
  });

  const arrowInner: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.13)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.14)",
  };

  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
        {logo}
        {title && (
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
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

      <div style={{ position: "relative" }}>
        <button onClick={() => scroll("left")} style={arrowBtn("left", canScrollLeft)} aria-label="Scroll left">
          <span style={arrowInner}>‹</span>
        </button>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 8,
            scrollbarWidth: "none",
          }}
        >
          {children}
        </div>

        <button onClick={() => scroll("right")} style={arrowBtn("right", canScrollRight)} aria-label="Scroll right">
          <span style={arrowInner}>›</span>
        </button>
      </div>
    </section>
  );
}
