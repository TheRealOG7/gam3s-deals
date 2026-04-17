import { lookupRawgImage } from "@/lib/rawg";
import { lookupPsnImage } from "@/lib/psn";

export const dynamic = "force-dynamic";

export async function GET() {
  const platKey = process.env.PLATPRICES_API_KEY ?? "";
  const dashUrl = process.env.DASHBOARD_URL ?? "";

  const result: Record<string, unknown> = {
    platprices_key_set: !!platKey,
    dashboard_url_set: !!dashUrl,
  };

  // 1. Fetch raw PlatPrices batch
  if (platKey) {
    try {
      const res = await fetch(
        `https://platprices.com/api.php?key=${encodeURIComponent(platKey)}&discount=1&region=US`,
        { headers: { "User-Agent": "GAM3SDeals/1.0" }, signal: AbortSignal.timeout(12000) }
      );
      result.platprices_status = res.status;
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        result.platprices_error = data.error ?? null;
        result.platprices_errorDesc = data.errorDesc ?? null;
        const raw = data.discounts;
        const items: Record<string, unknown>[] = Array.isArray(raw)
          ? raw
          : Object.values((raw as Record<string, unknown>) ?? {});
        result.platprices_raw_count = items.length;

        // Parse same way fetchPsDealsLive does
        const PS_JUNK = ["soundtrack", "avatar", "theme", "dlc", "season pass", "expansion", "bundle", "pack", "costume", "skin", "add-on", "addon", "content pack", "voice pack", "emote", "wallpaper", "artbook"];
        const cleanTitle = (t: string) => t.replace(/\s*\(ps[45]\s*(and\s*ps[45])?\)/gi, "").trim();
        const parsed = [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const r = item as Record<string, unknown>;
          const title = String(r.Name ?? "").trim();
          if (!title) continue;
          if (PS_JUNK.some(k => title.toLowerCase().includes(k))) continue;
          const saleCents = Number(r.SalePrice ?? 0);
          const baseCents = Number(r.BasePrice ?? 0);
          if (saleCents <= 0 || baseCents <= 0) continue;
          const savingsPct = Math.round((1 - saleCents / baseCents) * 100);
          parsed.push({ title: cleanTitle(title), raw_title: title, savings_pct: savingsPct, sale: (saleCents/100).toFixed(2), normal: (baseCents/100).toFixed(2) });
        }
        parsed.sort((a, b) => b.savings_pct - a.savings_pct);
        const top15 = parsed.slice(0, 15);
        result.platprices_parsed_count = parsed.length;
        result.platprices_top15 = top15;

        // 2. Test RAWG + PSN for each
        const imageResults = await Promise.all(top15.map(async (d) => {
          const rawg = await lookupRawgImage(d.title);
          const psn = await lookupPsnImage(d.title);
          return { title: d.title, rawg_url: rawg, psn_url: psn };
        }));
        result.image_lookup = imageResults;
      }
    } catch (e) {
      result.platprices_error = String(e);
    }
  }

  // 3. Check deals.json ps_deals
  if (dashUrl) {
    try {
      const res = await fetch(`${dashUrl.replace(/\/$/, "")}/public/deals.json`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        const ps = (data.ps_deals as Record<string, unknown>[]) ?? [];
        result.backend_ps_deals_count = ps.length;
        result.backend_ps_deals = ps.map(d => ({ title: d.title, savings_pct: d.savings_pct, has_thumb: !!d.thumb }));
      }
    } catch (e) {
      result.backend_deals_error = String(e);
    }
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
