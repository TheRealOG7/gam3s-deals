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
