# PS Plus Free Games — Design Spec

## Goal

Add PS Plus Essential monthly free games alongside the Epic free games section, split side-by-side in the top of the page.

## Context

The frontend (`/gam3s-deals/`) already fetches IG and Eneba deals directly via live fetchers in `lib/deals.ts`. PS Plus free games follow the same pattern — no Python backend changes needed.

The Epic free games section currently lives at the top of `DealsClient.tsx` as a single full-width `DealSection`. This section will be restructured into a two-column layout.

## Data Layer

**New function:** `fetchPsPlusFreeGames()` in `lib/deals.ts`

- Fetches PS Plus Essential monthly free games from PlayStation Store's public catalog API
- Endpoint: `https://store.playstation.com/en-us/pages/latest-offers/1/api`  
  (Fallback: psdeals.net public API if PlayStation Store blocks server requests)
- Returns `PsGame[]`:
  ```typescript
  export interface PsGame {
    title: string;
    original_price?: string;
    store_url: string;
    image_url?: string | null;
  }
  ```
- Uses the existing `cachedFetch` 5-minute TTL pattern
- Returns `[]` on any error (no crash)

**`page.tsx`:** Add `fetchPsPlusFreeGames()` to the parallel `Promise.all` block alongside existing fetches. Pass result as `psGames` prop to `DealsClient`.

## Component: `PsPlusCard.tsx`

New component mirroring `EpicFreeCard` structure:
- Width: 160px (narrower than Epic's current 240px)
- Image: 16/9 aspect ratio with `objectFit: cover`
- Badge: "FREE WITH PS+" in blue (`#003087` background, white text)
- Shows: title, original price struck through
- Links to PlayStation Store product page
- No date line (PS Plus monthly resets the 1st of each month)

## Layout Change

**`DealsClient.tsx`** — replace the single Epic `DealSection` with a two-column flex row:

```
┌─────────────────────┬─────────────────────┐
│  [Epic logo] FREE   │  [PS logo] FREE      │
│  THIS WEEK          │  THIS MONTH          │
│  [card][card][card] │  [card][card][card]  │
└─────────────────────┴─────────────────────┘
```

- Desktop: `display: flex, gap: 24px` — each column takes `flex: 1, minWidth: 0`
- Each column is a self-contained section with its own header and horizontal scroll
- Epic cards narrowed: 240px → 160px
- PS Plus cards: 160px
- Mobile (`max-width: 640px`): columns stack vertically, Epic on top
- Both sections only render if they have games (existing pattern)

## `DealsClientProps` update

Add `psGames: PsGame[]` to the props interface in `DealsClient.tsx`.

## Error Handling

`fetchPsPlusFreeGames()` returns `[]` on any fetch/parse error. If `psGames` is empty, the PS Plus column is hidden and the Epic section renders full-width (graceful degradation).

## Section Order (unchanged except top section restructure)

Two-column free section → Best Deals → AAA on Sale → PlayStation → Biggest Discounts → Instant Gaming → Eneba
