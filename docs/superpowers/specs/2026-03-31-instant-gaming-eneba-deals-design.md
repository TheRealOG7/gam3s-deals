# Instant Gaming + Eneba Direct Deals — Design Spec

## Goal

Add deals from Instant Gaming and Eneba as dedicated store sections, sourced directly from each store's own API with direct store URLs (no CheapShark redirects).

## Context

The dashboard backend (`/dashboard/scripts/`) runs collector scripts that write snapshot JSON, then `build_dashboard.py` assembles `docs/data/deals.json`. The Next.js frontend (`/gam3s-deals/`) fetches this JSON and renders it. GOG and PlayStation already follow this same pattern. We're adding two new stores using the same pattern.

## API Research

### Instant Gaming
- **Endpoint**: `GET https://www.instant-gaming.com/en/search/?onsale=1&sort_by=discount&type_filter=1&json=1&page=0`
- **Auth**: None required. Public Algolia-backed search endpoint.
- **Key fields per hit**: `name`, `seo_name`, `prod_id`, `currency_prices.USD` (sale price), `default_retail` (MSRP string), `discount` (IG's internal %), `reviews_avg` (0–100, -1 if none), `is_dlc` (bool), `preorder` (bool), `platform` (e.g. "Steam")
- **Product URL**: `https://www.instant-gaming.com/en/{prod_id}-{seo_name}/`
- **Savings calculation**: `round((default_retail - sale_usd) / default_retail * 100)` — IG's `discount` field is vs their own listed price, not MSRP; MSRP savings is more meaningful

### Eneba
- **Tech**: Algolia for product search. GraphQL for navigation/metadata only.
- **Algolia endpoint**: `https://{APP_ID}-dsn.algolia.net/1/indexes/{INDEX_NAME}/query`
- **Auth**: Search-only API key (public/readonly, visible in browser devtools Network tab under any eneba.com request to `algolia.net`)
- **Index name**: discoverable from network tab (typically `eneba_production_products` or similar)
- **Key fields**: product name, slug, price, MSRP, discount%, platform, DRM
- **Product URL**: `https://www.eneba.com/{slug}`
- **Credential discovery**: Required at implementation time. Open browser devtools → Network tab → visit eneba.com/store → filter for `algolia.net` requests → copy `x-algolia-application-id` and `x-algolia-api-key` headers.

## Backend Architecture

Two new scripts added to `/dashboard/scripts/`:

**`instant_gaming_deals.py`**
- Fetches 2 pages from IG search API (120 hits)
- Filters: PC platform, no DLC, no preorder, savings_pct >= 20% vs MSRP
- Deduplicates by title, keeps highest savings, limits to 15
- Saves `ig_data/daily_snapshots.json` with key `ig_deals`

**`eneba_deals.py`**
- Queries Algolia for on-sale PC games sorted by discount desc
- Filters: games only (no gift cards/DLC), savings_pct >= 20%
- Deduplicates by title, limits to 15
- Saves `eneba_data/daily_snapshots.json` with key `eneba_deals`
- Fails gracefully (writes empty list) if credentials are missing

**`build_dashboard.py`** changes:
- Add `IG_SNAPSHOTS` and `ENEBA_SNAPSHOTS` path constants
- Load both in `build_deals_data()`, add `ig_deals` and `eneba_deals` to the return dict
- Add both scripts to `COLLECTORS` list

## Frontend Architecture

**`lib/deals.ts`**: Add `ig_deals: Deal[]` and `eneba_deals: Deal[]` to `DealsData` interface.

**`app/page.tsx`**: Include `ig_deals` and `eneba_deals` in `allDeals` pool for savings/dedup calculation. These have no `steam_url` so the existing RAWG fallback handles images.

**`components/DealsClient.tsx`**: Two new `DealSection` rows added after "Biggest Discounts", using store logos. Follow the same pattern as the GOG section.

**`public/logos/`**: Add `instant-gaming.png` and `eneba.png`.

## Deal Schema (no changes to `Deal` interface needed)

Both stores map to the existing `Deal` shape:
- `title`, `sale_price`, `normal_price`, `savings_pct`, `deal_url` (direct store URL), `store_name` ("Instant Gaming" / "Eneba"), `expiry: null`, no `steam_url`

## Section Order

Epic Free → Best Deals → AAA on Sale → PlayStation → Biggest Discounts → **Instant Gaming** → **Eneba**

## Error Handling

Both scripts write an empty `[]` on any API failure so `build_dashboard.py` continues. The frontend hides sections with empty arrays (consistent with existing pattern).
