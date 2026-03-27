const rawgCache = new Map<string, string | null>();

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–]\s*(deluxe|ultimate|standard|complete|gold|goty|game of the year|definitive|remastered|anniversary|enhanced|expanded|collector'?s?)\s*(edition|ed\.?)?\s*$/i, "")
    .replace(/\s*:\s*(deluxe|ultimate|complete|gold|goty|remastered)\s*edition\s*$/i, "")
    .trim();
}

async function fetchRawgImage(query: string, apiKey: string): Promise<string | null> {
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=3&search_exact=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.results?.[0]?.background_image ?? null;
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
    let image = await fetchRawgImage(title, apiKey);

    // Retry with cleaned title if no result
    if (!image) {
      const cleaned = cleanTitle(title);
      if (cleaned !== title) {
        image = await fetchRawgImage(cleaned, apiKey);
      }
    }

    rawgCache.set(key, image);
    return image;
  } catch {
    rawgCache.set(key, null);
    return null;
  }
}
