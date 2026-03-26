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
      style={{
        display: "block",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        opacity: isCurrent ? 1 : 0.6,
        cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: "linear-gradient(160deg, #1e2d45, #0d1520)" }}>
        {image && (
          <Image src={image} alt={game.title} fill
            sizes="(max-width: 640px) 50vw, 25vw"
            style={{ objectFit: "cover" }} unoptimized />
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, transparent 40%, rgba(5,10,20,0.9) 100%)",
          zIndex: 1,
        }} />
        <div style={{
          position: "absolute", top: 7, left: 7, zIndex: 2,
          background: isCurrent ? "var(--orange)" : "rgba(255,255,255,0.12)",
          color: isCurrent ? "#000" : "var(--text-secondary)",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {isCurrent ? "FREE NOW" : "NEXT WEEK"}
        </div>
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{game.title}</div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
          {isCurrent
            ? `Until ${fmtDate(game.end_date)}${game.original_price && game.original_price !== "0" ? ` · was $${game.original_price}` : ""}`
            : `Starts ${fmtDate(game.start_date)}`}
        </div>
      </div>
    </a>
  );
}
