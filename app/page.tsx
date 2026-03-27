export const dynamic = "force-dynamic";

import Image from "next/image";
import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames } from "@/lib/deals";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY ?? "";

export default async function DealsPage() {
  const [deals, egs] = await Promise.all([
    fetchDeals(DASHBOARD_URL, DASHBOARD_API_KEY),
    fetchEgsGames(DASHBOARD_URL, DASHBOARD_API_KEY),
  ]);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 60px" }}>
      <header style={{
        display: "flex", alignItems: "center",
        paddingBottom: 18, marginBottom: 8, borderBottom: "1px solid var(--border)",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "#000",
          }}>
            G
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>GAM3S.GG Deals</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Best game deals updated daily</div>
          </div>
        </div>
      </header>

      <DealsClient deals={deals} egs={egs} />
    </main>
  );
}
