import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #080d18 0%, #0d1520 50%, #0a1628 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Grid lines background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Green glow accent */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,128,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* GAMES.GG label */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#00ff80",
            marginBottom: 28,
            display: "flex",
          }}
        >
          GAMES.GG
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1.05,
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Best Gaming</span>
          <span style={{ color: "#00ff80" }}>Deals This Week</span>
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 400,
            marginBottom: 52,
            display: "flex",
          }}
        >
          Steam · GOG · PlayStation · Epic · and more
        </div>

        {/* Store pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Steam", "GOG", "PlayStation", "Epic", "Fanatical"].map((store) => (
            <div
              key={store}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
              }}
            >
              {store}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
