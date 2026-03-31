# Instant Gaming + Eneba Direct Deals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add Instant Gaming and Eneba as dedicated deal sections in the dashboard backend and gam3s-deals frontend, with direct store URLs and no CheapShark dependency.

**Architecture:** Two new Python collector scripts write snapshots to their own data dirs; `build_dashboard.py` assembles them into `deals.json`; the Next.js frontend renders them as new `DealSection` rows following the exact same pattern as GOG and PlayStation.

**Tech Stack:** Python 3 (urllib, json, pathlib) for backend; Next.js 16 / React 19 / TypeScript for frontend; Vitest for frontend tests.

---

## File Map

### Backend (`/Users/og/Desktop/Claude/dashboard/scripts/`)
| File | Change |
|---|---|
| `instant_gaming_deals.py` | **Create** — IG collector script |
| `eneba_deals.py` | **Create** — Eneba collector script |
| `build_dashboard.py` | **Modify** — add IG + Eneba snapshot paths, load them in `build_deals_data()`, add to `COLLECTORS` |

### Frontend (`/Users/og/Desktop/Claude/gam3s-deals/`)
| File | Change |
|---|---|
| `lib/deals.ts` | **Modify** — add `ig_deals` and `eneba_deals` to `DealsData` |
| `app/page.tsx` | **Modify** — include IG/Eneba in `allDeals` pool |
| `components/DealsClient.tsx` | **Modify** — add two new `DealSection` rows |
| `public/logos/instant-gaming.png` | **Add** — store logo (download from IG site) |
| `public/logos/eneba.png` | **Add** — store logo (download from Eneba site) |
| `__tests__/deals.test.ts` | **Modify** — add `ig_deals`/`eneba_deals` to `DealsData` fixture |

---

## Task 1: `instant_gaming_deals.py`

**Files:**
- Create: `/Users/og/Desktop/Claude/dashboard/scripts/instant_gaming_deals.py`

- [x] **Step 1: Create the file**

```python
#!/usr/bin/env python3
"""
Instant Gaming Deals — PC game deal aggregation.
No authentication required (public Algolia-backed search API).
"""

import json
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime, timedelta, timezone

REQUEST_DELAY = 0.5
DATA_DIR = Path(__file__).parent / "ig_data"
SNAPSHOT_FILE = DATA_DIR / "daily_snapshots.json"

SEARCH_URL = "https://www.instant-gaming.com/en/search/"

JUNK_KEYWORDS = [
    "soundtrack", "ost", "artbook", "art book", "wallpaper", "costume pack",
    "sfx", "sound effect", "royalty free", "music bundle",
    "dlc", "season pass", "content pack", "expansion pass",
    "skin pack", "voice pack", "emote pack",
    "pdf", "ebook", "e-book", "guidebook",
]

# Platforms that indicate a non-PC game
CONSOLE_PLATFORMS = {
    "Xbox One", "Xbox Series X|S", "PlayStation 4", "PlayStation 5",
    "Nintendo Switch", "iOS", "Android",
}


def ig_get(page=0):
    """Fetch one page of on-sale PC games sorted by discount."""
    params = {
        "onsale": 1,
        "sort_by": "discount",
        "type_filter": 1,
        "json": 1,
        "page": page,
    }
    url = SEARCH_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": "OGGamingDashboard/1.0",
        "Accept": "application/json",
    })
    time.sleep(REQUEST_DELAY)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  IG error (page {page}): {e}", file=sys.stderr)
        return {}


def parse_deal(hit):
    """Parse a single IG search hit into a deal dict. Returns None if invalid."""
    # Skip DLC and preorders
    if hit.get("is_dlc") or hit.get("preorder"):
        return None

    # Skip console-platform entries
    platform = hit.get("platform", "")
    if platform in CONSOLE_PLATFORMS:
        return None

    title = hit.get("name", "").strip()
    if not title:
        return None

    # Skip junk by title keywords
    title_lower = title.lower()
    for kw in JUNK_KEYWORDS:
        if kw in title_lower:
            return None

    # Prices
    cprices = hit.get("currency_prices", {})
    sale_raw = cprices.get("USD") or cprices.get("usd")
    if sale_raw is None:
        return None
    try:
        sale_usd = float(sale_raw)
    except (TypeError, ValueError):
        return None
    if sale_usd <= 0:
        return None

    normal_raw = hit.get("default_retail", "0")
    try:
        normal_usd = float(normal_raw)
    except (TypeError, ValueError):
        normal_usd = 0.0
    if normal_usd <= 0:
        return None

    # Compute savings vs MSRP (IG's own `discount` field is vs their listed price, not MSRP)
    savings_pct = round((normal_usd - sale_usd) / normal_usd * 100)
    if savings_pct < 20:
        return None

    # Build direct URL
    prod_id = hit.get("prod_id", "")
    seo_name = hit.get("seo_name", "")
    if not prod_id or not seo_name:
        return None
    deal_url = f"https://www.instant-gaming.com/en/{prod_id}-{seo_name}/"

    reviews_avg = hit.get("reviews_avg", -1)

    return {
        "title": title,
        "sale_price": f"{sale_usd:.2f}",
        "normal_price": f"{normal_usd:.2f}",
        "savings_pct": savings_pct,
        "store_name": "Instant Gaming",
        "deal_url": deal_url,
        "expiry": None,
        "steam_rating": reviews_avg if reviews_avg >= 0 else 0,
    }


def is_real_game(deal):
    """Secondary filter: must have a title and a non-trivial price."""
    return bool(deal and deal.get("title") and float(deal.get("sale_price", 0)) >= 0.50)


def dedup_deals(deals, limit=15):
    """Keep highest-savings deal per normalised title, limit to N."""
    seen = {}
    for d in deals:
        key = d["title"].lower().strip()
        if key not in seen or d["savings_pct"] > seen[key]["savings_pct"]:
            seen[key] = d
    return list(seen.values())[:limit]


def load_snapshots():
    if SNAPSHOT_FILE.exists():
        with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_snapshot(snapshots, today_key, data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshots[today_key] = data
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    snapshots = {k: v for k, v in snapshots.items() if k >= cutoff}
    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshots, f, indent=2)
    return snapshots


def build_report():
    """Fetch IG deals and return structured data."""
    today = datetime.now().strftime("%Y-%m-%d")
    snapshots = load_snapshots()

    print("Fetching Instant Gaming deals (page 0)...", file=sys.stderr)
    page0 = ig_get(page=0)
    print("Fetching Instant Gaming deals (page 1)...", file=sys.stderr)
    page1 = ig_get(page=1)

    hits = page0.get("hits", []) + page1.get("hits", [])
    print(f"  Got {len(hits)} raw hits", file=sys.stderr)

    parsed = []
    for hit in hits:
        deal = parse_deal(hit)
        if deal and is_real_game(deal):
            parsed.append(deal)

    parsed.sort(key=lambda d: -d["savings_pct"])
    ig_deals = dedup_deals(parsed, limit=15)
    print(f"  Final: {len(ig_deals)} Instant Gaming deals", file=sys.stderr)

    snapshot_data = {
        "ig_deals": ig_deals,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    save_snapshot(snapshots, today, snapshot_data)
    return snapshot_data


if __name__ == "__main__":
    data = build_report()
    print(json.dumps(data, indent=2))
```

- [x] **Step 2: Run the script to verify it works**

```bash
cd /Users/og/Desktop/Claude/dashboard/scripts
python instant_gaming_deals.py 2>&1 | head -20
```

Expected output (stderr): lines about fetching pages and final deal count. stdout: JSON with `ig_deals` array containing up to 15 deals, each with `title`, `sale_price`, `normal_price`, `savings_pct >= 20`, `deal_url` starting with `https://www.instant-gaming.com/en/`.

- [x] **Step 3: Spot-check one deal URL**

Take the `deal_url` from the first deal in the output and open it in a browser (or curl -sI it) to confirm it resolves to a valid IG product page.

- [x] **Step 4: Commit**

```bash
cd /Users/og/Desktop/Claude/dashboard
git add scripts/instant_gaming_deals.py
git commit -m "feat: add Instant Gaming deals collector"
```

---

## Task 2: `eneba_deals.py`

**Files:**
- Create: `/Users/og/Desktop/Claude/dashboard/scripts/eneba_deals.py`

> **Credential discovery (do this before writing the code):**
> 1. Open Chrome/Firefox, go to `https://www.eneba.com/store/all?platform[]=pc&sort=discount_desc&type[]=game`
> 2. Open DevTools → Network tab → filter by "algolia"
> 3. Copy the `x-algolia-application-id` header value → this is `ENEBA_ALGOLIA_APP_ID`
> 4. Copy the `x-algolia-api-key` header value → this is `ENEBA_ALGOLIA_API_KEY`
> 5. Copy the index name from the request URL → this is `ENEBA_ALGOLIA_INDEX`
> 6. Set these as env vars or hardcode them as constants in the script (they are read-only public keys)

- [x] **Step 1: Create the file with discovered credentials**

Replace `YOUR_APP_ID`, `YOUR_API_KEY`, `YOUR_INDEX_NAME` with values found in step above.

```python
#!/usr/bin/env python3
"""
Eneba Deals — PC game deal aggregation via Algolia search API.
Credentials: read-only public search key (safe to embed, visible in browser devtools).
"""

import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from datetime import datetime, timedelta, timezone

REQUEST_DELAY = 0.5
DATA_DIR = Path(__file__).parent / "eneba_data"
SNAPSHOT_FILE = DATA_DIR / "daily_snapshots.json"

# Read-only public search credentials — visible in browser devtools network tab.
# Override via env vars for flexibility.
ALGOLIA_APP_ID = os.environ.get("ENEBA_ALGOLIA_APP_ID", "YOUR_APP_ID")
ALGOLIA_API_KEY = os.environ.get("ENEBA_ALGOLIA_API_KEY", "YOUR_API_KEY")
ALGOLIA_INDEX = os.environ.get("ENEBA_ALGOLIA_INDEX", "YOUR_INDEX_NAME")

JUNK_KEYWORDS = [
    "soundtrack", "ost", "artbook", "wallpaper", "costume pack", "gift card",
    "dlc", "season pass", "content pack", "expansion pass",
    "skin pack", "voice pack", "emote pack",
    "top-up", "topup", "credits", "coins", "points",
    "subscription", "membership",
]

# Only include PC DRM platforms
PC_DRMS = {"steam", "ea app", "gog", "ubisoft connect", "epic games", "battle.net", "origin", "pc"}


def algolia_search(page=0, hits_per_page=60):
    """Query Eneba's Algolia index for discounted PC games."""
    if ALGOLIA_APP_ID == "YOUR_APP_ID":
        print("  ENEBA_ALGOLIA_APP_ID not set, skipping", file=sys.stderr)
        return {}

    url = f"https://{ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/{ALGOLIA_INDEX}/query"
    body = json.dumps({
        "hitsPerPage": hits_per_page,
        "page": page,
        "filters": "onSale:true AND type:game",
        "facetFilters": [["platform:pc", "platform:PC", "drm:steam", "drm:Steam"]],
        "attributesToRetrieve": [
            "name", "slug", "type", "platform", "drm",
            "price", "originalPrice", "discountPercentage",
            "reviewScore", "reviewCount",
        ],
        "numericFilters": ["discountPercentage >= 20"],
    }).encode()

    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": ALGOLIA_APP_ID,
        "X-Algolia-API-Key": ALGOLIA_API_KEY,
        "User-Agent": "OGGamingDashboard/1.0",
    })
    time.sleep(REQUEST_DELAY)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  Eneba Algolia error (page {page}): {e}", file=sys.stderr)
        return {}


def parse_deal(hit):
    """Parse a single Algolia hit into a deal dict. Returns None if invalid."""
    title = (hit.get("name") or "").strip()
    if not title:
        return None

    title_lower = title.lower()
    for kw in JUNK_KEYWORDS:
        if kw in title_lower:
            return None

    # Price fields — exact names depend on Algolia index schema discovered at runtime.
    # Common patterns: price/originalPrice, salePrice/regularPrice, cheapestPrice/msrp
    # Adjust field names below based on what you see in devtools.
    sale_raw = hit.get("price") or hit.get("salePrice") or hit.get("cheapestPrice")
    normal_raw = hit.get("originalPrice") or hit.get("regularPrice") or hit.get("msrp")
    discount_raw = hit.get("discountPercentage") or hit.get("discount") or 0

    try:
        sale_usd = float(sale_raw) if sale_raw is not None else 0.0
        normal_usd = float(normal_raw) if normal_raw is not None else 0.0
        savings_pct = int(discount_raw)
    except (TypeError, ValueError):
        return None

    if sale_usd <= 0 or savings_pct < 20:
        return None

    # Compute normal_price from discount if not provided
    if normal_usd <= 0 and savings_pct > 0:
        normal_usd = round(sale_usd / (1 - savings_pct / 100), 2)

    slug = hit.get("slug") or hit.get("url") or ""
    if not slug:
        return None
    deal_url = f"https://www.eneba.com/{slug}" if not slug.startswith("http") else slug

    return {
        "title": title,
        "sale_price": f"{sale_usd:.2f}",
        "normal_price": f"{normal_usd:.2f}",
        "savings_pct": savings_pct,
        "store_name": "Eneba",
        "deal_url": deal_url,
        "expiry": None,
    }


def dedup_deals(deals, limit=15):
    seen = {}
    for d in deals:
        key = d["title"].lower().strip()
        if key not in seen or d["savings_pct"] > seen[key]["savings_pct"]:
            seen[key] = d
    return list(seen.values())[:limit]


def load_snapshots():
    if SNAPSHOT_FILE.exists():
        with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_snapshot(snapshots, today_key, data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    snapshots[today_key] = data
    cutoff = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    snapshots = {k: v for k, v in snapshots.items() if k >= cutoff}
    with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
        json.dump(snapshots, f, indent=2)
    return snapshots


def build_report():
    today = datetime.now().strftime("%Y-%m-%d")
    snapshots = load_snapshots()

    if ALGOLIA_APP_ID == "YOUR_APP_ID":
        print("Eneba credentials not configured, writing empty snapshot", file=sys.stderr)
        snapshot_data = {"eneba_deals": [], "date": datetime.now(timezone.utc).isoformat()}
        save_snapshot(snapshots, today, snapshot_data)
        return snapshot_data

    print("Fetching Eneba deals (page 0)...", file=sys.stderr)
    page0 = algolia_search(page=0)
    print("Fetching Eneba deals (page 1)...", file=sys.stderr)
    page1 = algolia_search(page=1)

    hits = page0.get("hits", []) + page1.get("hits", [])
    print(f"  Got {len(hits)} raw hits", file=sys.stderr)

    parsed = [d for hit in hits if (d := parse_deal(hit)) is not None]
    parsed.sort(key=lambda d: -d["savings_pct"])
    eneba_deals = dedup_deals(parsed, limit=15)
    print(f"  Final: {len(eneba_deals)} Eneba deals", file=sys.stderr)

    snapshot_data = {
        "eneba_deals": eneba_deals,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    save_snapshot(snapshots, today, snapshot_data)
    return snapshot_data


if __name__ == "__main__":
    data = build_report()
    print(json.dumps(data, indent=2))
```

- [x] **Step 2: Discover Algolia credentials and update constants**

Open browser devtools at `https://www.eneba.com/store/all?platform[]=pc&sort=discount_desc&type[]=game`, inspect a network request to `algolia.net`, and fill in `YOUR_APP_ID`, `YOUR_API_KEY`, `YOUR_INDEX_NAME`.

Also inspect one hit in the response to confirm the exact field names for price/originalPrice/discountPercentage — update `parse_deal()` if the names differ.

- [x] **Step 3: Run the script**

```bash
cd /Users/og/Desktop/Claude/dashboard/scripts
python eneba_deals.py 2>&1 | head -20
```

Expected: JSON with `eneba_deals` array, each deal having a `deal_url` starting with `https://www.eneba.com/` and `savings_pct >= 20`.

- [x] **Step 4: Commit**

```bash
cd /Users/og/Desktop/Claude/dashboard
git add scripts/eneba_deals.py
git commit -m "feat: add Eneba deals collector"
```

---

## Task 3: Update `build_dashboard.py`

**Files:**
- Modify: `/Users/og/Desktop/Claude/dashboard/scripts/build_dashboard.py`

- [x] **Step 1: Add snapshot path constants** (after the existing `QUEST_SNAPSHOTS` line ~line 31)

```python
IG_SNAPSHOTS = SCRIPTS_DIR / "ig_data" / "daily_snapshots.json"
ENEBA_SNAPSHOTS = SCRIPTS_DIR / "eneba_data" / "daily_snapshots.json"
```

- [x] **Step 2: Load IG and Eneba snapshots in `build_deals_data()`**

After the existing `# --- PlatPrices ---` block (around line 598), add:

```python
    # --- Instant Gaming ---
    ig_deals = []
    ig_snapshots = load_json(IG_SNAPSHOTS)
    if ig_snapshots:
        sorted_dates = sorted(ig_snapshots.keys())
        if sorted_dates:
            ig_data = ig_snapshots[sorted_dates[-1]]
            ig_deals = ig_data.get("ig_deals", [])

    # --- Eneba ---
    eneba_deals = []
    eneba_snapshots = load_json(ENEBA_SNAPSHOTS)
    if eneba_snapshots:
        sorted_dates = sorted(eneba_snapshots.keys())
        if sorted_dates:
            eneba_data = eneba_snapshots[sorted_dates[-1]]
            eneba_deals = eneba_data.get("eneba_deals", [])
```

- [x] **Step 3: Add `ig_deals` and `eneba_deals` to the return dict in `build_deals_data()`**

Change the return statement from:
```python
    return {
        "updated": now,
        "pc_source": pc_source,
        "best_deals": best_deals,
        "biggest_discounts": biggest_discounts,
        "top_rated": top_rated,
        "aaa_deals": aaa_deals,
        "gog_deals": gog_deals,
        "ps_deals": ps_deals,
    }
```
To:
```python
    return {
        "updated": now,
        "pc_source": pc_source,
        "best_deals": best_deals,
        "biggest_discounts": biggest_discounts,
        "top_rated": top_rated,
        "aaa_deals": aaa_deals,
        "gog_deals": gog_deals,
        "ps_deals": ps_deals,
        "ig_deals": ig_deals,
        "eneba_deals": eneba_deals,
    }
```

- [x] **Step 4: Add scripts to COLLECTORS list**

In the `COLLECTORS` list (around line 1313), add after `"platprices_deals.py"`:
```python
    "instant_gaming_deals.py",
    "eneba_deals.py",
```

- [x] **Step 5: Verify by running build_dashboard.py**

```bash
cd /Users/og/Desktop/Claude/dashboard/scripts
python build_dashboard.py 2>&1 | grep -E 'deals|ig|eneba'
```

Expected: a line like `Unified deals (itad): .../deals.json` with no errors.

Then check the output:
```bash
python -c "import json; d=json.load(open('../docs/data/deals.json')); print('ig_deals:', len(d.get('ig_deals',[])), 'eneba_deals:', len(d.get('eneba_deals',[])))"
```

Expected: `ig_deals: 15 eneba_deals: 15` (or fewer if not enough qualifying deals).

- [x] **Step 6: Commit**

```bash
cd /Users/og/Desktop/Claude/dashboard
git add scripts/build_dashboard.py
git commit -m "feat: include Instant Gaming and Eneba deals in deals.json"
```

---

## Task 4: Update `lib/deals.ts` (frontend)

**Files:**
- Modify: `/Users/og/Desktop/Claude/gam3s-deals/lib/deals.ts`

- [x] **Step 1: Add `ig_deals` and `eneba_deals` to `DealsData` interface**

Change:
```typescript
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
```
To:
```typescript
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
```

- [x] **Step 2: Run existing tests to confirm no breakage**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
npm test 2>&1 | tail -10
```

Expected: all tests pass.

- [x] **Step 3: Commit**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
git add lib/deals.ts
git commit -m "feat: add ig_deals and eneba_deals to DealsData interface"
```

---

## Task 5: Add store logos

**Files:**
- Create: `/Users/og/Desktop/Claude/gam3s-deals/public/logos/instant-gaming.png`
- Create: `/Users/og/Desktop/Claude/gam3s-deals/public/logos/eneba.png`

- [x] **Step 1: Download Instant Gaming logo**

```bash
curl -sL "https://www.instant-gaming.com/static/build/img/logo/instant-gaming.svg" \
  -o /Users/og/Desktop/Claude/gam3s-deals/public/logos/instant-gaming.svg
```

If that 404s, download from their press kit or take a screenshot of the logo from their site. The logo should be white/light for display on dark backgrounds — their favicon or header logo works. Save as `instant-gaming.png`, width ~120px.

- [x] **Step 2: Download Eneba logo**

```bash
curl -sL "https://assets.eneba.games/static/logo/eneba-logo-white.svg" \
  -o /Users/og/Desktop/Claude/gam3s-deals/public/logos/eneba.svg 2>/dev/null || \
curl -sL "https://www.eneba.com/static/logo.svg" \
  -o /Users/og/Desktop/Claude/gam3s-deals/public/logos/eneba.svg
```

If automated download fails: visit `https://www.eneba.com`, right-click the logo in the header, save as `eneba.png` or `eneba.svg`. White/light variant preferred for dark background.

- [x] **Step 3: Commit**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
git add public/logos/
git commit -m "feat: add Instant Gaming and Eneba store logos"
```

---

## Task 6: Update `app/page.tsx`

**Files:**
- Modify: `/Users/og/Desktop/Claude/gam3s-deals/app/page.tsx`

- [x] **Step 1: Add `ig_deals` and `eneba_deals` to the `allDeals` pool**

In `DealsPage()`, change the `allDeals` array (around line 199) from:
```typescript
  const allDeals = [
    ...(deals?.best_deals ?? []),
    ...(deals?.gog_deals ?? []),
    ...(deals?.biggest_discounts ?? []),
    ...(deals?.aaa_deals ?? []),
    ...(deals?.ps_deals ?? []),
  ];
```
To:
```typescript
  const allDeals = [
    ...(deals?.best_deals ?? []),
    ...(deals?.gog_deals ?? []),
    ...(deals?.biggest_discounts ?? []),
    ...(deals?.aaa_deals ?? []),
    ...(deals?.ps_deals ?? []),
    ...(deals?.ig_deals ?? []),
    ...(deals?.eneba_deals ?? []),
  ];
```

- [x] **Step 2: Commit**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
git add app/page.tsx
git commit -m "feat: include IG and Eneba deals in savings pool and dedup"
```

---

## Task 7: Update `components/DealsClient.tsx`

**Files:**
- Modify: `/Users/og/Desktop/Claude/gam3s-deals/components/DealsClient.tsx`

- [x] **Step 1: Add IG and Eneba to `allSections` and `buildBestDeals` input**

Change the `allSections` array (around line 53):
```typescript
  const allSections = deals ? [
    deals.best_deals, deals.gog_deals, deals.biggest_discounts,
    deals.top_rated, deals.aaa_deals, deals.ps_deals,
  ] : [];
```
To:
```typescript
  const allSections = deals ? [
    deals.best_deals, deals.gog_deals, deals.biggest_discounts,
    deals.top_rated, deals.aaa_deals, deals.ps_deals,
    deals.ig_deals, deals.eneba_deals,
  ] : [];
```

- [x] **Step 2: Add filtered deal arrays for IG and Eneba**

After the `const biggestDiscounts = ...` line (around line 63), add:
```typescript
  const igDeals = deals ? filterBest(deals.ig_deals ?? [], bestMap) : [];
  const enebaDeals = deals ? filterBest(deals.eneba_deals ?? [], bestMap) : [];
```

- [x] **Step 3: Add two new `DealSection` rows after the Biggest Discounts section**

After the closing `)}` of the `biggestDiscounts.length > 0` block (around line 143), add:

```tsx
      {igDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/instant-gaming.png" alt="Instant Gaming" width={100} height={18} unoptimized style={{ objectFit: "contain" }} />}
          title="Deals"
          allDeals={deals?.ig_deals ?? []}
          resolvedUrls={urls}
          resolvedReviews={reviews}
        >
          {igDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {enebaDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/eneba.png" alt="Eneba" width={72} height={18} unoptimized style={{ objectFit: "contain" }} />}
          title="Deals"
          allDeals={deals?.eneba_deals ?? []}
          resolvedUrls={urls}
          resolvedReviews={reviews}
        >
          {enebaDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}
```

- [x] **Step 4: Run the dev server and visually verify**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
npm run dev
```

Open `http://localhost:3000`. Confirm:
- Instant Gaming section appears after Biggest Discounts with store logo
- Eneba section appears after Instant Gaming with store logo
- Cards show correct prices, discount badges, and direct store links
- Deal URLs open correctly in a new tab

- [x] **Step 5: Run tests**

```bash
npm test 2>&1 | tail -10
```

Expected: all pass.

- [x] **Step 6: Commit**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
git add components/DealsClient.tsx
git commit -m "feat: add Instant Gaming and Eneba deal sections to frontend"
```

---

## Task 8: Update frontend tests

**Files:**
- Modify: `/Users/og/Desktop/Claude/gam3s-deals/__tests__/deals.test.ts`

- [x] **Step 1: Update the `DealsData` fixture to include new fields**

The existing test file doesn't test `DealsData` shape directly, but add a type-safety smoke test. Add after the existing `describe("fetchDeals", ...)` block:

```typescript
describe("DealsData shape", () => {
  it("ig_deals and eneba_deals are valid Deal arrays", () => {
    const data: import("@/lib/deals").DealsData = {
      updated: new Date().toISOString(),
      pc_source: "itad",
      best_deals: [],
      biggest_discounts: [],
      top_rated: [],
      aaa_deals: [],
      gog_deals: [],
      ps_deals: [],
      ig_deals: [makeDeal("Cyberpunk 2077", 40)],
      eneba_deals: [makeDeal("Elden Ring", 30)],
    };
    expect(data.ig_deals).toHaveLength(1);
    expect(data.eneba_deals[0].savings_pct).toBe(30);
  });
});
```

- [x] **Step 2: Run tests**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
npm test 2>&1 | tail -15
```

Expected: all tests pass including the new one.

- [x] **Step 3: Commit**

```bash
cd /Users/og/Desktop/Claude/gam3s-deals
git add __tests__/deals.test.ts
git commit -m "test: add DealsData shape test for ig_deals and eneba_deals"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Instant Gaming collector script with direct URLs
- ✅ Eneba collector script (pending credential discovery)
- ✅ Both added to `build_dashboard.py` pipeline
- ✅ `DealsData` interface updated
- ✅ `allDeals` pool updated in `page.tsx`
- ✅ Two new frontend sections in `DealsClient.tsx`
- ✅ Store logos added
- ✅ Tests updated

**Placeholder scan:**
- `YOUR_APP_ID` / `YOUR_API_KEY` / `YOUR_INDEX_NAME` in `eneba_deals.py` are intentional — the step immediately above them explains credential discovery. Not a real placeholder — it's a runtime configuration step.

**Type consistency:**
- `ig_deals` / `eneba_deals` — same name used in: `DealsData` interface, `build_deals_data()` return, `allDeals` array, `allSections` array, `filterBest()` calls, `DealSection` `allDeals` props.
- `igDeals` / `enebaDeals` — local filtered variables, used only in their respective `DealSection` renders.
