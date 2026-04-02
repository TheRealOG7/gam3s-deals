export default function Loading() {
  const cardRow = (count = 5) => (
    <div style={{ display: "flex", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: 160, flexShrink: 0, aspectRatio: "3/4" }} />
      ))}
    </div>
  );

  const section = (count?: number) => (
    <div style={{ marginBottom: 36 }}>
      <div className="skeleton" style={{ height: 1, marginBottom: 12, opacity: 0.2 }} />
      {cardRow(count)}
    </div>
  );

  return (
    <main style={{ padding: "12px 16px 40px" }}>
      {/* Savings banner */}
      <div className="skeleton" style={{ height: 32, width: 320, marginLeft: "auto", marginBottom: 20, borderRadius: 6 }} />

      {/* Two-column free games row */}
      <div style={{ display: "flex", gap: 24, marginBottom: 36 }}>
        {[3, 3].map((count, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <div className="skeleton" style={{ height: 1, marginBottom: 12, opacity: 0.2 }} />
            {cardRow(count)}
          </div>
        ))}
      </div>

      {/* Game Pass + deal sections */}
      {section(6)}
      {section()}
      {section()}
      {section()}
    </main>
  );
}
