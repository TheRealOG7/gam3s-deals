const rawgCache = new Map<string, string | null>();

const STOP = new Set(["the", "of", "and", "a", "an", "in", "on", "for", "to", "at", "its", "by"]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}

/**
 * Check if the result is a plausible match for the query.
 * Key insight: check what fraction of the *result's* words appear in the query.
 * "For Honor" result vs "FOR HONOR Year 8" query → "honor" in query → 1/1 = 100% ✓
 * "Gears of War" result vs "FOR HONOR Year 8" query → 0/2 = 0% ✗
 */
function isGoodMatch(query: string, resultName: string): boolean {
  const qSet = new Set(words(query));
  const rWords = words(resultName);
  if (rWords.length === 0) return false;
  const covered = rWords.filter(w => qSet.has(w)).length;
  return covered / rWords.length >= 0.6;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–]\s*(deluxe|ultimate|standard|complete|gold|goty|game of the year|definitive|remastered|anniversary|enhanced|expanded|collector'?s?)\s*(edition|ed\.?)?\s*$/i, "")
    .replace(/\s*(year\s*\d+)\s*(edition|ed\.?)?\s*$/i, "")
    .trim();
}

async function fetchBestMatch(query: string, apiKey: string): Promise<string | null> {
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=5`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const results: Array<{ name: string; background_image: string | null }> = data?.results ?? [];

  for (const r of results) {
    if (r.background_image && isGoodMatch(query, r.name)) {
      return r.background_image;
    }
  }
  return null;
}

export async function lookupRawgImage(title: string): Promise<string | null> {
  const key = title.toLowerCase().trim();
  if (rawgCache.has(key)) return rawgCache.get(key)!;

  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    rawgCache.set(key, null);
    return null;
  }

  try {
    // Try full title first
    let image = await fetchBestMatch(title, apiKey);

    // Retry with edition/year info stripped
    if (!image) {
      const cleaned = cleanTitle(title);
      if (cleaned !== title) {
        image = await fetchBestMatch(cleaned, apiKey);
      }
    }

    // Last resort: just the first 2 significant words
    if (!image) {
      const shortTitle = words(title).slice(0, 2).join(" ");
      if (shortTitle && shortTitle !== words(title).join(" ")) {
        image = await fetchBestMatch(shortTitle, apiKey);
      }
    }

    rawgCache.set(key, image);
    return image;
  } catch {
    rawgCache.set(key, null);
    return null;
  }
}
