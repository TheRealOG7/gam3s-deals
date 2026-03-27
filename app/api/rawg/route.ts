import { NextRequest, NextResponse } from "next/server";
import { lookupRawgImage } from "@/lib/rawg";

export { lookupRawgImage };

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ image: null });
  const image = await lookupRawgImage(q);
  return NextResponse.json({ image });
}
