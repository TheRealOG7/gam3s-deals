export interface Deal {
  title: string;
  sale_price: string;
  normal_price: string;
  savings_pct: number;
  deal_url: string;
  expiry: string | null;
  steam_score?: number;
  steam_count?: number;
  metacritic?: number;
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

export async function fetchDeals(dashboardUrl: string): Promise<DealsData | null> {
  try {
    const res = await fetch(`${dashboardUrl}/data/deals.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchEgsGames(dashboardUrl: string): Promise<EgsData | null> {
  try {
    const res = await fetch(`${dashboardUrl}/data/egs_free_games.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
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
