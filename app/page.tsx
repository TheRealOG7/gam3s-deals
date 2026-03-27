export const dynamic = "force-dynamic";

import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames } from "@/lib/deals";
import { lookupRawgImage } from "@/lib/rawg";
import type { Deal, EpicGame } from "@/lib/deals";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "";

/** Extract Steam portrait image URL directly from steam_url — no API call needed */
function steamPortrait(steamUrl?: string): string | null {
  const m = steamUrl?.match(/\/app\/(\d+)/);
  return m ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${m[1]}/library_600x900.jpg` : null;
}

async function resolveImages(
  deals: Deal[],
  epicGames: EpicGame[],
): Promise<Record<string, string | null>> {
  const tasks: Array<{ key: string; p: Promise<string | null> }> = [];

  for (const deal of deals) {
    const steam = steamPortrait(deal.steam_url);
    tasks.push({
      key: deal.title,
      p: steam ? Promise.resolve(steam) : lookupRawgImage(deal.title),
    });
  }
  for (const g of epicGames) {
    tasks.push({ key: g.title, p: lookupRawgImage(g.title) });
  }

  const results = await Promise.all(tasks.map((t) => t.p));
  const images: Record<string, string | null> = {};
  tasks.forEach((t, i) => { images[t.key] = results[i]; });
  return images;
}

export default async function DealsPage() {
  const [deals, egs] = await Promise.all([
    fetchDeals(DASHBOARD_URL),
    fetchEgsGames(DASHBOARD_URL),
  ]);

  const allDeals = [
    ...(deals?.best_deals ?? []),
    ...(deals?.gog_deals ?? []),
    ...(deals?.biggest_discounts ?? []),
    ...(deals?.top_rated ?? []),
    ...(deals?.aaa_deals ?? []),
    ...(deals?.ps_deals ?? []),
  ];
  const epicGames = [
    ...(egs?.current_free ?? []),
    ...(egs?.upcoming_free ?? []),
  ];

  // Deduplicate by title before fetching
  const uniqueDeals = [...new Map(allDeals.map((d) => [d.title, d])).values()];

  const images = await resolveImages(uniqueDeals, epicGames);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 16px 40px" }}>
      <DealsClient deals={deals} egs={egs} images={images} />
    </main>
  );
}
