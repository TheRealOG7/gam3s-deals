export const dynamic = "force-dynamic";

import Image from "next/image";
import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames, mergeDeals } from "@/lib/deals";
import { lookupRawgImage } from "@/lib/rawg";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "";
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY ?? "";

export default async function DealsPage() {
  const [deals, egs] = await Promise.all([
    fetchDeals(DASHBOARD_URL, DASHBOARD_API_KEY),
    fetchEgsGames(DASHBOARD_URL, DASHBOARD_API_KEY),
  ]);

  // Collect all unique titles to fetch images for
  const bestDeals = deals ? mergeDeals(deals.best_deals, deals.gog_deals) : [];
  const allTitles = new Set<string>([
    ...bestDeals.map((d) => d.title),
    ...(deals?.biggest_discounts ?? []).map((d) => d.title),
    ...(deals?.top_rated ?? []).map((d) => d.title),
    ...(deals?.aaa_deals ?? []).map((d) => d.title),
    ...(deals?.ps_deals ?? []).map((d) => d.title),
    ...(egs?.current_free ?? []).map((g) => g.title),
    ...(egs?.upcoming_free ?? []).map((g) => g.title),
  ]);

  // Fetch all images in parallel server-side
  const imageEntries = await Promise.all(
    [...allTitles].map(async (title) => [title, await lookupRawgImage(title)] as const)
  );
  const images: Record<string, string | null> = Object.fromEntries(imageEntries);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 60px" }}>
      {/* Header */}
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

      <DealsClient deals={deals} egs={egs} images={images} />
    </main>
  );
}
