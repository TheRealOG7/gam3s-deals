export const dynamic = "force-dynamic";

import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames, fetchIgDealsLive, fetchEnebaDealsLive, fetchPsPlusFreeGames, fetchGamePassGames, fetchSwitchDealsLive } from "@/lib/deals";
import { lookupRawgImage } from "@/lib/rawg";
import type { Deal, EpicGame, PsGame } from "@/lib/deals";

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "";

// ── Redirect resolver ─────────────────────────────────────────────────────────
const redirectCache = new Map<string, string>();

async function resolveUrl(url: string): Promise<string> {
  if (!url || !url.includes("cheapshark.com/redirect")) return url;
  if (redirectCache.has(url)) return redirectCache.get(url)!;
  try {
    // CheapShark doesn't follow HEAD redirects — use GET and discard body
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const final = res.url && res.url !== url ? res.url : url;
    redirectCache.set(url, final);
    return final;
  } catch {
    return url;
  }
}

// ── Steam CDN images ──────────────────────────────────────────────────────────
function steamPortrait(steamUrl?: string): string | null {
  const m = steamUrl?.match(/\/app\/(\d+)/);
  return m ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${m[1]}/library_600x900.jpg` : null;
}

function steamCapsule(steamUrl?: string): string | null {
  const m = steamUrl?.match(/\/app\/(\d+)/);
  return m ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${m[1]}/capsule_616x353.jpg` : null;
}

// ── Concurrent batch runner ───────────────────────────────────────────────────
async function batch<T>(fns: Array<() => Promise<T>>, concurrency = 5): Promise<T[]> {
  const results: T[] = new Array(fns.length);
  let i = 0;
  async function worker() {
    while (i < fns.length) {
      const idx = i++;
      results[idx] = await fns[idx]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Steam review lookup (direct from Steam API — covers edition variants CheapShark misses) ──
const steamReviewCache = new Map<string, { text: string; count: number } | null>();

const steamSearchCache = new Map<string, string | null>();

async function findSteamAppId(title: string): Promise<string | null> {
  const key = title.toLowerCase();
  if (steamSearchCache.has(key)) return steamSearchCache.get(key)!;
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) { steamSearchCache.set(key, null); return null; }
    const data = await res.json();
    const appId = data?.items?.[0]?.id?.toString() ?? null;
    steamSearchCache.set(key, appId);
    return appId;
  } catch {
    steamSearchCache.set(key, null);
    return null;
  }
}

async function fetchSteamReview(steamUrl: string | undefined, title: string): Promise<{ text: string; count: number } | null> {
  // Get app ID from steam_url if available, otherwise search Steam by title
  let appId: string | null = steamUrl?.match(/\/app\/(\d+)/)?.[1] ?? null;
  if (!appId) appId = await findSteamAppId(title);
  if (!appId) return null;

  if (steamReviewCache.has(appId)) return steamReviewCache.get(appId)!;
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) { steamReviewCache.set(appId, null); return null; }
    const data = await res.json();
    const s = data?.query_summary;
    if (!s?.review_score_desc || s.review_score_desc === "No user reviews") {
      steamReviewCache.set(appId, null); return null;
    }
    const result = { text: s.review_score_desc as string, count: (s.total_reviews as number) ?? 0 };
    steamReviewCache.set(appId, result);
    return result;
  } catch {
    steamReviewCache.set(appId, null);
    return null;
  }
}

async function resolveReviews(deals: Deal[]): Promise<Record<string, { text: string; count: number } | null>> {
  // Skip PlayStation deals — everything else gets Steam review lookup
  const nonPsDeals = deals.filter((d) => d.store_name !== "PlayStation");
  const keys = nonPsDeals.map((d) => d.title);
  const fns = nonPsDeals.map((d) => () => fetchSteamReview(d.steam_url, d.title));
  const results = await batch(fns, 6);
  const reviews: Record<string, { text: string; count: number } | null> = {};
  keys.forEach((k, i) => { reviews[k] = results[i]; });
  return reviews;
}

// ── Image URL validator — HEAD check with cache ───────────────────────────────
const imageExistsCache = new Map<string, boolean>();

async function imageExists(url: string): Promise<boolean> {
  if (imageExistsCache.has(url)) return imageExistsCache.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    const ok = res.ok;
    imageExistsCache.set(url, ok);
    return ok;
  } catch {
    imageExistsCache.set(url, false);
    return false;
  }
}

// ── Image + URL resolution ────────────────────────────────────────────────────
async function resolveImages(
  deals: Deal[],
  epicGames: EpicGame[],
  psGames: PsGame[],
): Promise<Record<string, string | null>> {
  const keys: string[] = [];
  const fns: Array<() => Promise<string | null>> = [];

  for (const deal of deals) {
    keys.push(deal.title);
    const portrait = steamPortrait(deal.steam_url);
    const capsule = steamCapsule(deal.steam_url);
    if (portrait && capsule) {
      // Steam game: try portrait first, always fall back to capsule (universally available)
      fns.push(async () => {
        const ok = await imageExists(portrait);
        return ok ? portrait : capsule;
      });
    } else {
          // No steam_url: for Nintendo eShop use thumb directly; for others try RAWG first
      fns.push(async () => {
        if (deal.store_name === "Nintendo eShop") {
          if (deal.thumb && await imageExists(deal.thumb)) return deal.thumb;
          return null;
        }
        const rawg = await lookupRawgImage(deal.title);
        if (rawg && await imageExists(rawg)) return rawg;
        if (deal.thumb && await imageExists(deal.thumb)) return deal.thumb;
        return null;
      });
    }
  }
  for (const g of epicGames) {
    keys.push(g.title);
    fns.push(async () => {
      const rawg = await lookupRawgImage(g.title);
      if (rawg && await imageExists(rawg)) return rawg;
      // Fall back to Steam CDN when RAWG has no result
      const appId = await findSteamAppId(g.title);
      if (!appId) return null;
      const portrait = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      const ok = await imageExists(portrait);
      return ok ? portrait : `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
    });
  }
  for (const g of psGames) {
    keys.push(g.title);
    fns.push(async () => {
      const rawg = await lookupRawgImage(g.title);
      if (rawg && await imageExists(rawg)) return rawg;
      return null;
    });
  }

  const results = await batch(fns, 6);
  const images: Record<string, string | null> = {};
  keys.forEach((k, i) => { images[k] = results[i]; });
  return images;
}

async function resolveUrls(deals: Deal[]): Promise<Record<string, string>> {
  const keys = deals.map((d) => d.title);
  const fns = deals.map((deal) => () => {
    // If deal_url is already a direct store URL (GOG, PS Store, etc.), use it
    if (deal.deal_url && !deal.deal_url.includes("cheapshark.com")) {
      return Promise.resolve(deal.deal_url);
    }
    // Only use steam_url when the deal is actually on Steam (not just related to a Steam game)
    if (deal.steam_url && deal.store_name === "Steam") {
      return Promise.resolve(deal.steam_url);
    }
    // For all other cases (Gamesplanet, GreenManGaming, Fanatical, Epic, etc.)
    // CheapShark uses a JS redirect that can't be followed server-side — use as-is
    return Promise.resolve(deal.deal_url || "");
  });
  const results = await batch(fns, 8);
  const urls: Record<string, string> = {};
  keys.forEach((k, i) => { urls[k] = results[i]; });
  return urls;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DealsPage() {
  const [[rawDeals, egs], liveIg, liveEneba, psGames, gamePassGames, switchDeals] = await Promise.all([
    Promise.all([fetchDeals(DASHBOARD_URL), fetchEgsGames(DASHBOARD_URL)]),
    fetchIgDealsLive(),
    fetchEnebaDealsLive(),
    fetchPsPlusFreeGames(),
    fetchGamePassGames(100),
    fetchSwitchDealsLive(),
  ]);

  const activeDeals = (arr: Deal[]) => (arr ?? []).filter(d => d.savings_pct > 0);

  // Inject live IG/Eneba data when the backend hasn't been updated yet
  const deals = rawDeals ? {
    ...rawDeals,
    best_deals: activeDeals(rawDeals.best_deals),
    gog_deals: activeDeals(rawDeals.gog_deals),
    biggest_discounts: activeDeals(rawDeals.biggest_discounts),
    top_rated: activeDeals(rawDeals.top_rated),
    aaa_deals: activeDeals(rawDeals.aaa_deals),
    ps_deals: activeDeals(rawDeals.ps_deals),
    ig_deals: (rawDeals.ig_deals?.length ?? 0) > 0 ? activeDeals(rawDeals.ig_deals) : liveIg,
    eneba_deals: (rawDeals.eneba_deals?.length ?? 0) > 0 ? activeDeals(rawDeals.eneba_deals) : liveEneba,
  } : null;

  // Only include sections that are actually displayed — top_rated is not shown
  const allDeals = [
    ...(deals?.best_deals ?? []),
    ...(deals?.gog_deals ?? []),
    ...(deals?.biggest_discounts ?? []),
    ...(deals?.aaa_deals ?? []),
    ...(deals?.ps_deals ?? []),
    ...(deals?.ig_deals ?? []),
    ...(deals?.eneba_deals ?? []),
    ...switchDeals,
  ];
  const epicGames = [
    ...(egs?.current_free ?? []),
    ...(egs?.upcoming_free ?? []),
  ];

  // Deduplicate: normalize title (strip edition suffixes), keep highest-discount deal per game
  function normTitle(t: string) {
    return t
      .replace(/\s*[-–:]\s*(deluxe|ultimate|standard|complete|gold|goty|game of the year|definitive|remastered|anniversary|enhanced|expanded|collector'?s?)\s*(edition|ed\.?)?\s*$/i, "")
      .toLowerCase().trim();
  }
  const bestByTitle = new Map<string, Deal>();
  for (const deal of allDeals) {
    const key = normTitle(deal.title);
    const ex = bestByTitle.get(key);
    if (!ex || deal.savings_pct > ex.savings_pct) bestByTitle.set(key, deal);
  }
  const uniqueDeals = [...bestByTitle.values()];

  const [images, urls, reviews] = await Promise.all([
    resolveImages(uniqueDeals, epicGames, psGames),
    resolveUrls(uniqueDeals),
    resolveReviews(uniqueDeals),
  ]);

  // Total savings: one entry per unique game, using its best discount
  const totalSavings = uniqueDeals.reduce((sum, d) => {
    const saved = parseFloat(d.normal_price) - parseFloat(d.sale_price);
    return sum + (isNaN(saved) || saved < 0 ? 0 : saved);
  }, 0);

  return (
    <main style={{ padding: "12px 16px 40px" }}>
      <DealsClient deals={deals} egs={egs} images={images} urls={urls} reviews={reviews} totalSavings={totalSavings} dealCount={uniqueDeals.length} psGames={psGames} gamePassGames={gamePassGames} switchDeals={switchDeals} />
    </main>
  );
}
