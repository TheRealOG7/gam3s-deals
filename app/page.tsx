export const dynamic = "force-dynamic";

import { DealsClient } from "@/components/DealsClient";
import { fetchDeals, fetchEgsGames } from "@/lib/deals";
import { lookupRawgImage } from "@/lib/rawg";
import type { Deal, EpicGame } from "@/lib/deals";

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

async function fetchSteamReview(steamUrl: string): Promise<{ text: string; count: number } | null> {
  const m = steamUrl.match(/\/app\/(\d+)/);
  if (!m) return null;
  const appId = m[1];
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
  const steamDeals = deals.filter((d) => d.steam_url);
  const keys = steamDeals.map((d) => d.title);
  const fns = steamDeals.map((d) => () => fetchSteamReview(d.steam_url!));
  const results = await batch(fns, 8);
  const reviews: Record<string, { text: string; count: number } | null> = {};
  keys.forEach((k, i) => { reviews[k] = results[i]; });
  return reviews;
}

// ── Steam portrait validator (not all games have library_600x900.jpg) ─────────
const steamPortraitCache = new Map<string, boolean>();

async function steamPortraitExists(url: string): Promise<boolean> {
  if (steamPortraitCache.has(url)) return steamPortraitCache.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    const ok = res.ok;
    steamPortraitCache.set(url, ok);
    return ok;
  } catch {
    steamPortraitCache.set(url, false);
    return false;
  }
}

// ── Image + URL resolution ────────────────────────────────────────────────────
async function resolveImages(
  deals: Deal[],
  epicGames: EpicGame[],
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
        const ok = await steamPortraitExists(portrait);
        return ok ? portrait : capsule;
      });
    } else {
      // No steam_url: try RAWG, then fall back to deal's own thumbnail
      fns.push(async () => {
        const rawg = await lookupRawgImage(deal.title);
        return rawg || deal.thumb || null;
      });
    }
  }
  for (const g of epicGames) {
    keys.push(g.title);
    fns.push(() => lookupRawgImage(g.title));
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

  const uniqueDeals = [...new Map(allDeals.map((d) => [d.title, d])).values()];

  const [images, urls, reviews] = await Promise.all([
    resolveImages(uniqueDeals, epicGames),
    resolveUrls(uniqueDeals),
    resolveReviews(uniqueDeals),
  ]);

  // Total potential savings across all unique deals shown
  const totalSavings = uniqueDeals.reduce((sum, d) => {
    const saved = parseFloat(d.normal_price) - parseFloat(d.sale_price);
    return sum + (isNaN(saved) || saved < 0 ? 0 : saved);
  }, 0);

  return (
    <main style={{ padding: "12px 16px 40px" }}>
      <DealsClient deals={deals} egs={egs} images={images} urls={urls} reviews={reviews} totalSavings={totalSavings} dealCount={uniqueDeals.length} />
    </main>
  );
}
