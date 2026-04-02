"use client";

import Image from "next/image";
import type { EpicGame } from "@/lib/deals";

interface EpicFreeCardProps {
  game: EpicGame;
  isCurrent: boolean;
  image: string | null;
}

function fmtDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "TBA";
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EpicFreeCard({ game, isCurrent, image }: EpicFreeCardProps) {
  return (
    <a
      href={game.store_url}
      target="_blank"
      rel="noopener noreferrer"
      className="epic-free-card"
      style={{
        display: "block",
        position: "relative",
        flexShrink: 0,
        width: 160,
        aspectRatio: "3/4",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(160deg, #1e2d45, #0d1520)",
        cursor: "pointer",
        opacity: isCurrent ? 1 : 0.6,
      }}
    >
      {image && (
        <Image src={image} alt={game.title} fill
          sizes="160px"
          style={{ objectFit: "cover" }} unoptimized />
      )}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 25%, rgba(5,10,20,0.75) 55%, rgba(5,10,20,0.98) 100%)",
        zIndex: 1,
      }} />
      {/* Top-left corner shadow for logo visibility */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 40% at 0% 0%, rgba(0,0,0,0.55) 0%, transparent 100%)",
      }} />
      {/* Epic logo top-left */}
      <div style={{ position: "absolute", top: 7, left: 7, zIndex: 2, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        <Image src="/logos/epic.png" alt="Epic Games" width={46} height={20} unoptimized
          style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }} />
        <div style={{
          background: isCurrent ? "var(--green)" : "rgba(255,255,255,0.12)",
          color: isCurrent ? "#000" : "var(--text-secondary)",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {isCurrent ? "FREE NOW" : "NEXT WEEK"}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 9px", zIndex: 2 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: 3, lineHeight: 1.35,
        }}>{game.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>Free</span>
          {game.original_price && game.original_price !== "0" && (
            <span style={{ fontSize: 10, color: "var(--text-secondary)", textDecoration: "line-through" }}>
              {game.original_price}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
          {isCurrent ? `Until ${fmtDate(game.end_date)}` : `Starts ${fmtDate(game.start_date)}`}
        </div>
      </div>
    </a>
  );
}
