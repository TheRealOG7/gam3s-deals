"use client";

import Image from "next/image";
import type { PsGame } from "@/lib/deals";

export function PsPlusCard({ game, image }: { game: PsGame; image: string | null }) {
  const src = image ?? game.image_url ?? null;
  return (
    <a
      href={game.store_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        position: "relative",
        flexShrink: 0,
        width: 160,
        aspectRatio: "3/4",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "linear-gradient(160deg, #1a1a3e, #0d1520)",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      {src && (
        <Image src={src} alt={game.title} fill sizes="160px"
          style={{ objectFit: "cover" }} unoptimized
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 25%, rgba(5,10,20,0.75) 55%, rgba(5,10,20,0.98) 100%)",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute", top: 7, left: 7, zIndex: 2,
        background: "#003087", color: "#fff",
        fontSize: 9, fontWeight: 800, padding: "2px 7px",
        borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>Free with PS+</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 9px", zIndex: 2 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", marginBottom: 3, lineHeight: 1.35,
        }}>{game.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#4a9eff" }}>Free</span>
          {game.original_price && (
            <span style={{ fontSize: 10, color: "var(--text-secondary)", textDecoration: "line-through" }}>
              {game.original_price}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
