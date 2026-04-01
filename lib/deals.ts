export interface Deal {
  title: string;
  sale_price: string;
  normal_price: string;
  savings_pct: number;
  deal_url: string;
  steam_url?: string;
  store_name?: string;
  expiry?: string | null;
  steam_score?: number;
  steam_rating?: number;
  steam_rating_text?: string;
  steam_count?: number;
  metacritic?: number;
  thumb?: string;
}

export interface DealsData {
  updated: string;
  pc_source: string;
  best_deals: Deal[];
  biggest_discounts: Deal[];
  top_rated: Deal[];
  aaa_deals: Deal[];
  gog_deals: Deal[];
  ps_deals: Deal[];
  ig_deals: Deal[];
  eneba_deals: Deal[];
}

export interface EpicGame {
  title: string;
  publisher?: string;
  original_price: string;
  description?: string;
  store_url: string;
  start_date?: string;
  end_date?: string;
}

export interface EgsData {
  updated: string;
  current_free: EpicGame[];
  upcoming_free: EpicGame[];
}

export interface PsGame {
  title: string;
  original_price?: string;
  store_url: string;
  image_url?: string | null;
}

export interface GamePassGame {
  title: string;
  original_price?: string;
  store_url: string;
  image_url?: string | null;
}

export function timeAgo(isoString: string | null): string {
  if (!isoString) return "unknown";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
}

function authHeaders(apiKey?: string): HeadersInit {
  return apiKey ? { "x-api-key": apiKey } : {};
}

// Server-side cache — survives across requests for 5 minutes
const TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; ts: number }>();

async function cachedFetch<T>(url: string, headers: HeadersInit): Promise<T | null> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < TTL) return cached.data as T;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(url, { data, ts: Date.now() });
    return data as T;
  } catch {
    return null;
  }
}

export async function fetchDeals(dashboardUrl: string, apiKey?: string): Promise<DealsData | null> {
  if (!dashboardUrl) return null;
  const base = dashboardUrl.replace(/\/$/, "");
  return cachedFetch<DealsData>(`${base}/public/deals.json`, {});
}

export async function fetchEgsGames(dashboardUrl: string, apiKey?: string): Promise<EgsData | null> {
  if (!dashboardUrl) return null;
  const base = dashboardUrl.replace(/\/$/, "");
  return cachedFetch<EgsData>(`${base}/public/egs_free_games.json`, {});
}

// ── Direct live fetches (bypass Python backend for IG + Eneba) ───────────────

const JUNK_KW = [
  "soundtrack", "ost", "artbook", "wallpaper", "costume pack", "gift card",
  "dlc", "season pass", "content pack", "expansion pass", "skin pack",
  "voice pack", "emote pack", "top-up", "topup", "credits", "coins",
  "points", "subscription", "membership",
];

function dedup(deals: Deal[], limit = 15): Deal[] {
  const seen = new Set<string>();
  return deals
    .sort((a, b) => b.savings_pct - a.savings_pct)
    .filter(d => {
      const k = d.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit);
}

export async function fetchIgDealsLive(): Promise<Deal[]> {
  try {
    const allHits: Record<string, unknown>[] = [];
    for (const page of [0, 1]) {
      const res = await fetch(
        `https://www.instant-gaming.com/en/search/?onsale=1&sort_by=discount&type_filter=1&json=1&page=${page}`,
        {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) break;
      const data = await res.json() as Record<string, unknown>;
      const hits = (data.hits ?? []) as Record<string, unknown>[];
      allHits.push(...hits);
    }

    const deals: Deal[] = [];
    for (const hit of allHits) {
      if (hit.is_dlc || hit.preorder) continue;
      const platform = String(hit.platform ?? "").toLowerCase();
      if (!platform.includes("steam") && platform !== "pc") continue;
      const title = String(hit.name ?? "").trim();
      if (!title) continue;
      if (JUNK_KW.some(k => title.toLowerCase().includes(k))) continue;

      const prices = (hit.currency_prices ?? {}) as Record<string, number>;
      const saleUsd = prices.USD;
      if (!saleUsd || saleUsd <= 0) continue;

      const retailUsd = typeof hit.default_retail === "number"
        ? hit.default_retail
        : parseFloat(String(hit.default_retail ?? "").replace(/[^0-9.]/g, ""));
      if (!retailUsd || retailUsd <= 0) continue;

      const savingsPct = Math.round((retailUsd - saleUsd) / retailUsd * 100);
      if (savingsPct < 20) continue;

      const reviewsAvg = typeof hit.reviews_avg === "number" && hit.reviews_avg >= 0
        ? Math.round(hit.reviews_avg) : undefined;

      deals.push({
        title,
        sale_price: saleUsd.toFixed(2),
        normal_price: retailUsd.toFixed(2),
        savings_pct: savingsPct,
        store_name: "Instant Gaming",
        deal_url: `https://www.instant-gaming.com/en/${hit.prod_id}-${hit.seo_name}/`,
        ...(reviewsAvg !== undefined ? { steam_rating: reviewsAvg } : {}),
      });
    }
    return dedup(deals);
  } catch {
    return [];
  }
}

const ENEBA_GQL = "https://graphql.eneba.com/graphql/";
const ENEBA_HASH = "7b19719a11c4f40def184daea9bbe6906b439e20aa7d177fc53a57ef9a0e2531_2df7f0e24e026cd0da0fdf51ff08fd81411fc3b2d69c89c892c1cbb0cb7fa86e3301c3b4418078030622a8ab07294c8e6de856e9ea939752c56526498ad02607";

export async function fetchEnebaDealsLive(): Promise<Deal[]> {
  try {
    const res = await fetch(ENEBA_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "x-version": "1.3553.0",
        "origin": "https://www.eneba.com",
        "referer": "https://www.eneba.com/",
      },
      body: JSON.stringify({
        operationName: "Store",
        variables: {
          first: 100,
          currency: "USD",
          url: "/store/all",
          redirectUrl: "/store/all",
          context: { country: "US", language: "en", region: "north_america" },
          os: ["WINDOWS"],
          types: ["game"],
          drms: ["steam"],
          sortBy: "PRICE_ASC",
          searchType: "DEFAULT",
        },
        extensions: { persistedQuery: { sha256Hash: ENEBA_HASH, version: 1 } },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const result = await res.json() as Record<string, unknown>;
    const data = result.data as Record<string, unknown> | undefined;
    const search = data?.search as Record<string, unknown> | undefined;
    const results = search?.results as Record<string, unknown> | undefined;
    const edges = (results?.edges as unknown[]) ?? [];

    const deals: Deal[] = [];
    for (const e of edges) {
      const node = (e as Record<string, unknown>).node as Record<string, unknown> | undefined;
      if (!node) continue;
      const title = String(node.name ?? "").trim();
      if (!title) continue;
      if (JUNK_KW.some(k => title.toLowerCase().includes(k))) continue;

      const auction = node.cheapestAuction as Record<string, unknown> | undefined;
      if (!auction) continue;
      const priceObj = auction.price as Record<string, number> | undefined;
      const msrpObj = auction.msrp as Record<string, number> | undefined;
      const discountPct = auction.msrpDiscountPercent as number | undefined;

      if (!priceObj || (priceObj.amount ?? 0) <= 0) continue;
      if (!msrpObj || (msrpObj.amount ?? 0) <= 0) continue;
      if (typeof discountPct !== "number" || discountPct < 20 || discountPct > 100) continue;

      const slug = String(node.slug ?? "");
      if (!slug) continue;

      deals.push({
        title,
        sale_price: (priceObj.amount / 100).toFixed(2),
        normal_price: (msrpObj.amount / 100).toFixed(2),
        savings_pct: Math.round(discountPct),
        store_name: "Eneba",
        deal_url: `https://www.eneba.com/${slug}`,
      });
    }
    return dedup(deals);
  } catch {
    return [];
  }
}

// PS Plus Essential monthly free games — UPDATE first Tuesday of each month
// Source: https://blog.playstation.com (search "PlayStation Plus Monthly Games for <Month>")
// April 2026 (Apr 7 – May 4)
const PS_PLUS_MONTHLY: PsGame[] = [
  {
    title: "Lords of the Fallen",
    original_price: "$59.99",
    store_url: "https://store.playstation.com/en-us/search/Lords%20of%20the%20Fallen",
  },
  {
    title: "Tomb Raider I-III Remastered",
    original_price: "$29.99",
    store_url: "https://store.playstation.com/en-us/search/Tomb%20Raider%20I-III%20Remastered",
  },
  {
    title: "Sword Art Online Fractured Daydream",
    original_price: "$59.99",
    store_url: "https://store.playstation.com/en-us/search/Sword%20Art%20Online%20Fractured%20Daydream",
  },
];

export async function fetchPsPlusFreeGames(): Promise<PsGame[]> {
  return PS_PLUS_MONTHLY;
}

export async function fetchGamePassGames(limit = 15): Promise<GamePassGame[]> {
  const catalogUrl = "https://catalog.gamepass.com/sigls/v2?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-us&market=US";
  const cached = cache.get(catalogUrl);
  if (cached && Date.now() - cached.ts < TTL) return cached.data as GamePassGame[];

  try {
    const catalogRes = await fetch(catalogUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!catalogRes.ok) return [];

    const catalog = await catalogRes.json() as Array<Record<string, unknown>>;
    const ids = catalog
      .filter(item => typeof item.id === "string")
      .map(item => item.id as string)
      .slice(0, limit);

    if (ids.length === 0) return [];

    const detailsRes = await fetch(
      `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids.join(",")}&market=US&languages=en-us`,
      {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!detailsRes.ok) return [];

    const details = await detailsRes.json() as Record<string, unknown>;
    const products = (details.Products as Record<string, unknown>[]) ?? [];

    const games: GamePassGame[] = products
      .map((product): GamePassGame | null => {
        const localized = (product.LocalizedProperties as Record<string, unknown>[])?.[0];
        if (!localized) return null;

        const title = String(localized.ProductTitle ?? "").trim();
        if (!title) return null;

        const images = (localized.Images as Record<string, unknown>[]) ?? [];
        const cover =
          images.find(img => img.ImagePurpose === "SuperHeroArt") ??
          images.find(img => img.ImagePurpose === "TitledHeroArt") ??
          images.find(img => img.ImagePurpose === "BoxArt") ??
          images.find(img => img.ImagePurpose === "Poster") ??
          images[0];
        const rawUri = cover ? String(cover.Uri ?? "") : "";
        const imageUrl = rawUri
          ? rawUri.startsWith("//") ? `https:${rawUri}` : rawUri
          : null;

        const skus = (product.DisplaySkuAvailabilities as Record<string, unknown>[]) ?? [];
        const availabilities = (skus[0]?.Availabilities as Record<string, unknown>[]) ?? [];
        const priceObj = (availabilities[0]?.OrderManagementData as Record<string, unknown>)?.Price as Record<string, number> | undefined;
        const listPrice = priceObj?.ListPrice;
        const priceStr = listPrice && listPrice > 0 ? `$${listPrice.toFixed(2)}` : undefined;

        const productId = String(product.ProductId ?? "");
        const storeUrl = productId
          ? `https://www.microsoft.com/store/apps/${productId}`
          : "https://www.xbox.com/en-US/games/game-pass";

        return { title, original_price: priceStr, store_url: storeUrl, image_url: imageUrl };
      })
      .filter((g): g is GamePassGame => g !== null);

    cache.set(catalogUrl, { data: games, ts: Date.now() });
    return games;
  } catch {
    return [];
  }
}

export function mergeDeals(a: Deal[], b: Deal[]): Deal[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((d) => {
      const key = d.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((x, y) => y.savings_pct - x.savings_pct);
}
