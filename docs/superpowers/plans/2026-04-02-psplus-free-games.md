# PS Plus Free Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PS Plus Essential monthly free games in a two-column layout alongside the Epic free games section.

**Architecture:** `fetchPsPlusFreeGames()` fetches directly from PlayStation Store's public chihiro API in the Next.js server component. A new `PsPlusCard` component mirrors `EpicFreeCard`. `DealsClient` wraps both sections in a flex row.

**Tech Stack:** Next.js 15 App Router, TypeScript, PlayStation Store chihiro API (`store.playstation.com/store/api/chihiro/...`)

---

### Task 1: Add `PsGame` type and `fetchPsPlusFreeGames()` to `lib/deals.ts`

**Files:**
- Modify: `lib/deals.ts`
- Test: `__tests__/deals.test.ts`

- [ ] **Step 1: Write a failing test for the PsGame type shape**

Open `__tests__/deals.test.ts` and add at the bottom:

```typescript
describe("fetchPsPlusFreeGames", () => {
  it("returns an array (empty on fetch failure)", async () => {
    // If the PS Store API is unreachable in CI, it should return []
    const { fetchPsPlusFreeGames } = await import("@/lib/deals");
    const result = await fetchPsPlusFreeGames();
    expect(Array.isArray(result)).toBe(true);
  });

  it("PsGame shape has required fields", () => {
    const game: import("@/lib/deals").PsGame = {
      title: "Hollow Knight",
      original_price: "$14.99",
      store_url: "https://store.playstation.com/en-us/product/UP1822-CUSA13632_00",
      image_url: "https://example.com/img.jpg",
    };
    expect(game.title).toBe("Hollow Knight");
    expect(game.store_url).toContain("playstation.com");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest --testPathPattern="deals.test" 2>&1 | tail -20
```

Expected: FAIL — `fetchPsPlusFreeGames is not a function`

- [ ] **Step 3: Add `PsGame` interface and `fetchPsPlusFreeGames` to `lib/deals.ts`**

Add after the `EgsData` interface (around line 45):

```typescript
export interface PsGame {
  title: string;
  original_price?: string;
  store_url: string;
  image_url?: string | null;
}
```

Then add after `fetchEnebaDealsLive` (before `mergeDeals`):

```typescript
export async function fetchPsPlusFreeGames(): Promise<PsGame[]> {
  const url =
    "https://store.playstation.com/store/api/chihiro/00_09_000/container/US/en/999/STORE-MSF77008-PSPLUSFREEGAMES";
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < TTL) return cached.data as PsGame[];

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as Record<string, unknown>;
    const links = (data.links as Record<string, unknown>[]) ?? [];

    const games: PsGame[] = links
      .map((link): PsGame | null => {
        const title = String(link.name ?? "").trim();
        if (!title) return null;

        // Extract product ID from the chihiro API URL to build the real store URL
        const apiUrl = String(link.url ?? "");
        const m = apiUrl.match(/\/([A-Z]{2}\d{4}-[A-Z0-9_]+-[A-Z0-9]+)\/\d+/);
        const storeUrl = m
          ? `https://store.playstation.com/en-us/product/${m[1]}`
          : "https://store.playstation.com/en-us/";

        // Type 12 = cover art, fall back to first image
        const images = (link.images as Record<string, unknown>[]) ?? [];
        const cover = images.find(img => (img.type as number) === 12) ?? images[0];

        const sku = link.default_sku as Record<string, unknown> | undefined;
        const displayPrice = String(sku?.display_price ?? "").trim();

        return {
          title,
          original_price: displayPrice || undefined,
          store_url: storeUrl,
          image_url: cover ? String(cover.url ?? "") : null,
        };
      })
      .filter((g): g is PsGame => g !== null);

    cache.set(url, { data: games, ts: Date.now() });
    return games;
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest --testPathPattern="deals.test" 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 6: Commit**

```bash
git add lib/deals.ts __tests__/deals.test.ts
git commit -m "feat: add PsGame type and fetchPsPlusFreeGames from PS Store API"
```

---

### Task 2: Create `PsPlusCard` component

**Files:**
- Create: `components/PsPlusCard.tsx`

- [ ] **Step 1: Create `components/PsPlusCard.tsx`**

```typescript
"use client";

import Image from "next/image";
import type { PsGame } from "@/lib/deals";

export function PsPlusCard({ game }: { game: PsGame }) {
  return (
    <a
      href={game.store_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        flexShrink: 0,
        width: 160,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      <div style={{
        position: "relative",
        aspectRatio: "16/9",
        background: "linear-gradient(160deg, #1a1a3e, #0d1520)",
      }}>
        {game.image_url && (
          <Image
            src={game.image_url}
            alt={game.title}
            fill
            sizes="160px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        )}
        <div style={{
          position: "absolute", top: 7, left: 7, zIndex: 2,
          background: "#003087", color: "#fff",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          Free with PS+
        </div>
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: "var(--text)",
          marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {game.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#003087" }}>Free</span>
          {game.original_price && (
            <span style={{
              fontSize: 10, color: "var(--text-secondary)",
              textDecoration: "line-through",
            }}>
              {game.original_price}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/PsPlusCard.tsx
git commit -m "feat: add PsPlusCard component"
```

---

### Task 3: Add `style` prop to `DealSection` for layout flexibility

**Files:**
- Modify: `components/DealSection.tsx`

The two-column wrapper will control vertical margin, so `DealSection` needs to accept a style override on its outer `<section>`.

- [ ] **Step 1: Add `style` prop to `DealSection`**

In `components/DealSection.tsx`, update the `DealSectionProps` interface (around line 6) and the `<section>` element (around line 178):

```typescript
// In DealSectionProps interface, add:
style?: React.CSSProperties;
```

```typescript
// In function signature destructure, add style:
export function DealSection({ title, logo, badge, badgeColor = "dim", allDeals, resolvedUrls, resolvedReviews, headerExtra, children, style }: DealSectionProps) {
```

```typescript
// On the outer <section> element (line ~178), change:
<section style={{ marginBottom: 36 }}>
// to:
<section style={{ marginBottom: 36, ...style }}>
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/DealSection.tsx
git commit -m "feat: add style prop to DealSection for layout overrides"
```

---

### Task 4: Update `EpicFreeCard` width and `DealsClient` layout

**Files:**
- Modify: `components/EpicFreeCard.tsx`
- Modify: `components/DealsClient.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Narrow `EpicFreeCard` from 240px to 160px**

In `components/EpicFreeCard.tsx` line ~27, change:

```typescript
width: 240,
```
to:
```typescript
width: 160,
```

- [ ] **Step 2: Update `DealsClientProps` and imports in `DealsClient.tsx`**

In `components/DealsClient.tsx`, update the import at line 1:

```typescript
import { PsPlusCard } from "@/components/PsPlusCard";
```

Add `PsGame` to the type import:

```typescript
import type { Deal, DealsData, EgsData, PsGame } from "@/lib/deals";
```

Update `DealsClientProps` interface:

```typescript
interface DealsClientProps {
  deals: DealsData | null;
  egs: EgsData | null;
  images: Record<string, string | null>;
  urls: Record<string, string>;
  reviews: Record<string, { text: string; count: number } | null>;
  totalSavings: number;
  dealCount: number;
  psGames: PsGame[];
}
```

Update the function signature:

```typescript
export function DealsClient({ deals, egs, images, urls, reviews, totalSavings, dealCount, psGames }: DealsClientProps) {
```

- [ ] **Step 3: Replace the Epic section with a two-column layout**

In `components/DealsClient.tsx`, find the current Epic section (around line 93):

```typescript
      {epicGames.length > 0 && (
        <DealSection
          logo={<Image src="/logos/epic.png" alt="Epic Games" width={64} height={18} unoptimized style={{ objectFit: "contain" }} />}
          badge="Free This Week"
          badgeColor="dim"
        >
          {epicGames.map((g) => (
            <EpicFreeCard
              key={g.title}
              game={g}
              isCurrent={egs?.current_free?.some((c) => c.title === g.title) ?? false}
              image={images[g.title] ?? null}
            />
          ))}
        </DealSection>
      )}
```

Replace it with:

```typescript
      {(epicGames.length > 0 || psGames.length > 0) && (
        <div className="free-games-row" style={{ display: "flex", gap: 24, marginBottom: 36 }}>
          {epicGames.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <DealSection
                logo={<Image src="/logos/epic.png" alt="Epic Games" width={64} height={18} unoptimized style={{ objectFit: "contain" }} />}
                badge="Free This Week"
                badgeColor="dim"
                style={{ marginBottom: 0 }}
              >
                {epicGames.map((g) => (
                  <EpicFreeCard
                    key={g.title}
                    game={g}
                    isCurrent={egs?.current_free?.some((c) => c.title === g.title) ?? false}
                    image={images[g.title] ?? null}
                  />
                ))}
              </DealSection>
            </div>
          )}
          {psGames.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <DealSection
                logo={<Image src="/logos/playstation.png" alt="PlayStation" width={60} height={18} unoptimized style={{ objectFit: "contain" }} />}
                badge="Free This Month"
                badgeColor="dim"
                style={{ marginBottom: 0 }}
              >
                {psGames.map((g) => (
                  <PsPlusCard key={g.title} game={g} />
                ))}
              </DealSection>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 4: Add mobile stacking CSS**

In `app/globals.css`, add inside the `@media (max-width: 640px)` block:

```css
  .free-games-row { flex-direction: column; }
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 6: Commit**

```bash
git add components/EpicFreeCard.tsx components/DealsClient.tsx app/globals.css
git commit -m "feat: two-column free games layout (Epic left, PS Plus right)"
```

---

### Task 5: Wire up `fetchPsPlusFreeGames` in `page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Import `fetchPsPlusFreeGames` and `PsGame`**

In `app/page.tsx`, update the import:

```typescript
import { fetchDeals, fetchEgsGames, fetchIgDealsLive, fetchEnebaDealsLive, fetchPsPlusFreeGames } from "@/lib/deals";
```

- [ ] **Step 2: Add PS Plus fetch to the parallel `Promise.all`**

Find the current fetch block (around line 193):

```typescript
  const [[rawDeals, egs], liveIg, liveEneba] = await Promise.all([
    Promise.all([fetchDeals(DASHBOARD_URL), fetchEgsGames(DASHBOARD_URL)]),
    fetchIgDealsLive(),
    fetchEnebaDealsLive(),
  ]);
```

Replace with:

```typescript
  const [[rawDeals, egs], liveIg, liveEneba, psGames] = await Promise.all([
    Promise.all([fetchDeals(DASHBOARD_URL), fetchEgsGames(DASHBOARD_URL)]),
    fetchIgDealsLive(),
    fetchEnebaDealsLive(),
    fetchPsPlusFreeGames(),
  ]);
```

- [ ] **Step 3: Pass `psGames` to `DealsClient`**

Find the `<DealsClient ...>` render (around line 241) and add the prop:

```typescript
      <DealsClient
        deals={deals}
        egs={egs}
        images={images}
        urls={urls}
        reviews={reviews}
        totalSavings={totalSavings}
        dealCount={uniqueDeals.length}
        psGames={psGames}
      />
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 5: Run tests**

```bash
npx jest 2>&1 | tail -20
```

Expected: all passing

- [ ] **Step 6: Commit and push**

```bash
git add app/page.tsx
git commit -m "feat: wire up PS Plus free games fetch in page.tsx"
git push
```
