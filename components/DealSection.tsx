"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import type { Deal } from "@/lib/deals";

interface DealSectionProps {
  title?: string;
  logo?: ReactNode;
  badge?: string;
  badgeColor?: "green" | "dim";
  allDeals?: Deal[];
  resolvedUrls?: Record<string, string>;
  resolvedReviews?: Record<string, { text: string; count: number } | null>;
  headerExtra?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}

const badgeStyles: Record<string, React.CSSProperties> = {
  green: { background: "var(--green)", color: "#000" },
  dim: { background: "rgba(255,255,255,0.08)", color: "var(--text-secondary)" },
};

function DealsModal({ title, deals, resolvedUrls, resolvedReviews, onClose }: { title: string; deals: Deal[]; resolvedUrls?: Record<string, string>; resolvedReviews?: Record<string, { text: string; count: number } | null>; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 12, width: "100%", maxWidth: 680,
          maxHeight: "80vh", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text)" }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-dim)", fontSize: 18, lineHeight: 1,
              padding: "10px 4px 10px 20px", margin: "-10px -4px -10px 0",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {deals.map((deal, i) => (
            <a
              key={deal.title}
              href={resolvedUrls?.[deal.title] ?? deal.steam_url ?? deal.deal_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 18px", borderBottom: "1px solid var(--border)",
                cursor: "pointer", textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 11, color: "var(--text-dim)", width: 20, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deal.title}
                </div>
                {resolvedReviews?.[deal.title] ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {resolvedReviews[deal.title]!.count > 0
                      ? `${resolvedReviews[deal.title]!.text} (${resolvedReviews[deal.title]!.count.toLocaleString()})`
                      : resolvedReviews[deal.title]!.text}
                  </div>
                ) : deal.steam_rating_text ? (
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{deal.steam_rating_text}</div>
                ) : null}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)", textDecoration: "line-through" }}>
                  ${deal.normal_price}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  ${deal.sale_price}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                  background: "var(--green)", color: "#000", minWidth: 40, textAlign: "center",
                }}>
                  −{deal.savings_pct}%
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DealSection({ title, logo, badge, badgeColor = "dim", allDeals, resolvedUrls, resolvedReviews, headerExtra, children, style }: DealSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setHasOverflow(overflow);
      setCanScrollRight(overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    width: 28, height: 28, borderRadius: "50%",
    background: "rgba(255,255,255,0.13)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.14)",
  };

  const sectionLabel = title ?? "Deals";

  return (
    <section style={{ marginBottom: 36, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border)", flexWrap: "wrap", minHeight: 44 }}>
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
        {allDeals && allDeals.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              marginLeft: "auto", flexShrink: 0,
              background: "var(--green)", color: "#000",
              fontSize: 10, fontWeight: 800, padding: "3px 10px",
              borderRadius: 5, border: "none", cursor: "pointer",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}
          >
            View All
          </button>
        )}
        {headerExtra && (
          <div className="section-header-extra">{headerExtra}</div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        {hasOverflow && (
          <button onClick={() => scroll("left")} style={arrowBtn("left", canScrollLeft)} aria-label="Scroll left">
            <span style={arrowInner}>‹</span>
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="card-scroll"
          style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}
        >
          {children}
        </div>
        {hasOverflow && (
          <button onClick={() => scroll("right")} style={arrowBtn("right", canScrollRight)} aria-label="Scroll right">
            <span style={arrowInner}>›</span>
          </button>
        )}
      </div>

      {modalOpen && allDeals && (
        <DealsModal title={sectionLabel} deals={allDeals} resolvedUrls={resolvedUrls} resolvedReviews={resolvedReviews} onClose={() => setModalOpen(false)} />
      )}
    </section>
  );
}
