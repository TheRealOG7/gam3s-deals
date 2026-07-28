# Gated Preview Page Design

**Date:** 2026-07-29  
**Status:** Approved

## Overview

A `/preview` route that mirrors the full deals page but gates deal sections behind a blur overlay for non-subscribers. Clicking the gate sends users to `https://games.gg/games-plus/`. The existing `/` route for subscribers is completely untouched.

This page runs in an iframe on gam3s.gg for all non-subscribers.

## Architecture

**Approach:** `gated` prop threads through `DealsClient` → `DealSection`. No data logic is duplicated — all fetching lives in `lib/deals.ts`.

## Components & Changes

### 1. New file: `app/preview/page.tsx`

Identical to `app/page.tsx` in every way — same imports, same data fetching (all APIs: CheapShark, EGS, PS Plus, Game Pass, Switch, IG, Eneba), same image/URL/review resolution, same `<main>` wrapper.

Only difference:
```tsx
<DealsClient ... gated={true} />
```

### 2. Modified: `components/DealsClient.tsx`

Add `gated?: boolean` to `DealsClientProps`. Thread it down to every `DealSection` call for deal sections only.

**Gated sections** (blurred when `gated={true}`):
- Best Deals
- GOG Deals
- Biggest Discounts
- AAA Deals
- PS Deals
- Switch Deals
- IG Deals
- Eneba Deals

**Always fully visible** (free content, shown to all):
- Epic Free Games
- PS Plus Free Games
- Game Pass

### 3. Modified: `components/DealSection.tsx`

Add `gated?: boolean` prop.

**When `gated` is false/undefined:** renders exactly as today. No change.

**When `gated` is true:**
- Items 1–3: render normally (fully visible, clickable)
- Items 4+: rendered inside a blurred container:
  - `filter: blur(6px)`
  - `pointer-events: none`
  - `user-select: none`
- A lock overlay sits absolutely positioned over the blurred block:
  - 🔒 icon + "Unlock all deals" heading
  - "+X more deals" count (where X = total items − 3)
  - CTA button: `href="https://games.gg/games-plus/"` with `target="_blank"`
- Outer wrapper: `position: relative` so overlay stacks correctly

## Gate Behaviour

| Section type | Non-subscriber | Subscriber |
|---|---|---|
| Deal sections (Best, GOG, PS, etc.) | 3 visible + blur gate | All visible |
| Epic Free Games | All visible | All visible |
| PS Plus Free Games | All visible | All visible |
| Game Pass | All visible | All visible |

## CTA

Clicking the lock overlay button redirects to `https://games.gg/games-plus/` in a new tab (`target="_blank"` so the iframe doesn't navigate the parent page).

## Route

| URL | Audience | Served via |
|---|---|---|
| `/` | Subscribers | Direct link / dashboard embed |
| `/preview` | Non-subscribers | iframe on gam3s.gg |

## What doesn't change

- All data fetching, ISR caching, image resolution, review scores
- Card designs (`DealCard`, `EpicFreeCard`, `PsPlusCard`, `GamePassCard`)
- The subscriber page at `/`
- `IframeHeightReporter` — reused as-is on `/preview`
