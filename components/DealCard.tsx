"use client";

import Image from "next/image";
import type { Deal } from "@/lib/deals";

interface DealCardProps {
  deal: Deal;
  image: string | null;
  href: string;
  review?: { text: string; count: number } | null;
}

const STORE_LOGOS: Record<string, string> = {
  "Instant Gaming": "/logos/instant-gaming.png",
  "Eneba": "/logos/eneba.png",
  "PlayStation": "/logos/playstation.png",
  "Steam": "/logos/steam.svg",
  "GOG": "/logos/gog.png",
  "GreenManGaming": "/logos/greenmangaming.png",
  "Fanatical": "/logos/fanatical.png",
  "Humble Store": "/logos/humble.png",
  "Gamesplanet": "/logos/gamesplanet.png",
};

function expiresSoon(expiry?: string | null): boolean {
  if (!expiry) return false;
  const ms = new Date(expiry).getTime() - Date.now();
  return ms > 0 && ms < 72 * 60 * 60 * 1000;
}

export function DealCard({ deal, image, href, review }: DealCardProps) {
  const reviewText = review
    ? review.count > 0
      ? `${review.text} (${review.count.toLocaleString()})`
      : review.text
    : null;
  const storeLogo = deal.store_name ? STORE_LOGOS[deal.store_name] : undefined;
  const showExpiry = expiresSoon(deal.expiry);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="deal-card-link"
      style={{
        display: "block",
        position: "relative",
        flexShrink: 0,
        width: 160,
        aspectRatio: "3/4",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(160deg, #1e2d45 0%, #0d1520 100%)",
        cursor: "pointer",
      }}
    >
      {image && (
        <Image
          src={image}
          alt={deal.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          style={{ objectFit: "cover" }}
          unoptimized
        />
      )}
      {/* Bottom vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 25%, rgba(5,10,20,0.75) 55%, rgba(5,10,20,0.98) 100%)",
        zIndex: 1,
      }} />
      {/* Top-left corner shadow so store logo is legible over any image */}
      {storeLogo && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 40% at 0% 0%, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }} />
      )}
      {/* Top-left: store logo + expires soon stacked */}
      <div style={{ position: "absolute", top: 7, left: 7, zIndex: 2, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        {storeLogo && (
          <Image src={storeLogo} alt={deal.store_name ?? ""} width={16} height={16} unoptimized
            style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }} />
        )}
        {showExpiry && (
          <div style={{
            background: "var(--orange)", color: "#000",
            fontSize: 9, fontWeight: 800, padding: "2px 6px",
            borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            Expires Soon
          </div>
        )}
      </div>
      {/* Top-right: discount badge */}
      <div style={{
        position: "absolute", top: 7, right: 7,
        background: "var(--green)", color: "#000",
        fontSize: 10, fontWeight: 800, padding: "2px 7px",
        borderRadius: 5, zIndex: 2,
      }}>
        −{deal.savings_pct}%
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 9px", zIndex: 2 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: 3, lineHeight: 1.35,
        }}>
          {deal.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            ${deal.sale_price}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", textDecoration: "line-through" }}>
            ${deal.normal_price}
          </span>
        </div>
        {reviewText && (
          <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, opacity: 0.8 }}>
            {reviewText}
          </div>
        )}
      </div>
    </a>
  );
}
