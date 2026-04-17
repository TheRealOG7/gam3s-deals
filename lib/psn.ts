const psnCache = new Map<string, string | null>();

export async function lookupPsnImage(title: string): Promise<string | null> {
  const key = title.toLowerCase();
  if (psnCache.has(key)) return psnCache.get(key)!;

  try {
    const res = await fetch(
      `https://store.playstation.com/valkyrie-api/en/US/19/search?query=${encodeURIComponent(title)}&index=MutablePlayStationStore&start=0&size=3&game_content_type=games`,
      {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) { psnCache.set(key, null); return null; }

    const data = await res.json() as Record<string, unknown>;
    const included = (data?.included ?? []) as Record<string, unknown>[];
    for (const item of included) {
      const attrs = (item?.attributes ?? {}) as Record<string, unknown>;
      const base = attrs["thumbnail-url-base"];
      if (base && typeof base === "string") {
        const url = `${base}320w`;
        psnCache.set(key, url);
        return url;
      }
    }
  } catch { /* fall through */ }

  psnCache.set(key, null);
  return null;
}
