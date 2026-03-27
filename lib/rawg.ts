const rawgCache = new Map<string, string | null>();

const STOP = new Set(["the", "of", "and", "a", "an", "in", "on", "for", "to", "at", "its", "by"]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}

function isGoodMatch(query: string, resultName: string): boolean {
  const qSet = new Set(words(query));
  const rWords = words(resultName);
  if (rWords.length === 0) return false;
  const covered = rWords.filter(w => qSet.has(w)).length;
  return covered / rWords.length >= 0.6;
}

/** Strip edition/year info to get the base game name */
function baseGameTitle(title: string): string {
  return title
    // Strip "- Deluxe Edition", "- Year 8", ": Gold Edition" etc.
    .replace(/\s*[-–:]\s*(deluxe|ultimate|standard|complete|gold|goty|game of the year|definitive|remastered|anniversary|enhanced|expanded|collector'?s?|digital|legendary)\s*(edition|ed\.?)?\s*$/i, "")
    .replace(/\s*[-–:]\s*year\s*\d+(\s+\w+\s*(edition|ed\.?)?)?\s*$/i, "")
    .replace(/\s*(edition|ed\.?)\s*$/i, "")
    .replace(/\s+for\s+(ps[45]?|xbox|switch|pc)\s*$/i, "")
    .replace(/\s*[-–:]\s*\d{4}\s*$/i, "")
    .trim();
}

async function searchRawg(query: string, apiKey: string): Promise<string | null> {
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=5`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const results: Array<{ name: string; background_image: string | null }> = data?.results ?? [];
    for (const r of results) {
      if (r.background_image && isGoodMatch(query, r.name)) {
        return r.background_image;
      }
    }
    // If similarity check blocked everything, return first result's image if any results came back
    if (results.length > 0 && results[0].background_image) {
      return results[0].background_image;
    }
  } catch {}
  return null;
}

export async function lookupRawgImage(title: string): Promise<string | null> {
  // Always search using the base game name, not edition-specific names
  const base = baseGameTitle(title);
  const cacheKey = base.toLowerCase();

  if (rawgCache.has(cacheKey)) return rawgCache.get(cacheKey)!;

  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    rawgCache.set(cacheKey, null);
    return null;
  }

  const image = await searchRawg(base, apiKey);
  rawgCache.set(cacheKey, image);
  return image;
}
