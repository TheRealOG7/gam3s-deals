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
        flexShrink: 0,
        width: 160,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      <div style={{
        position: "relative",
        aspectRatio: "16/9",
        background: "linear-gradient(160deg, #1a1a3e, #0d1520)",
      }}>
        {src && (
          <Image
            src={src}
            alt={game.title}
            fill
            sizes="160px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        )}
        <div style={{
          position: "absolute", top: 7, left: 7, zIndex: 2,
          background: "#003087", color: "#fff",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Free with PS+
        </div>
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {game.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#003087" }}>Free</span>
          {game.original_price && (
            <span style={{
              fontSize: 10, color: "var(--text-secondary)",
              textDecoration: "line-through",
            }}>
              {game.original_price}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
