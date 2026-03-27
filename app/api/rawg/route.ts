import { NextRequest, NextResponse } from "next/server";

export const rawgCache = new Map<string, string | null>();

export async function lookupRawgImage(title: string): Promise<string | null> {
  const key = title.toLowerCase().trim();
  if (rawgCache.has(key)) return rawgCache.get(key)!;

  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    rawgCache.set(key, null);
    return null;
  }

  try {
    const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(title)}&page_size=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      rawgCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const image: string | null = data?.results?.[0]?.background_image ?? null;
    rawgCache.set(key, image);
    return image;
  } catch {
    rawgCache.set(key, null);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ image: null });
  const image = await lookupRawgImage(q);
  return NextResponse.json({ image });
}
