export async function GET() {
  const url = process.env.DASHBOARD_URL ?? "";
  const key = process.env.DASHBOARD_API_KEY ?? "";

  if (!url) return Response.json({ error: "DASHBOARD_URL not set" });

  const testUrl = `${url.replace(/\/$/, "")}/data/deals.json${key ? `?api_key=${key}` : ""}`;

  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    return Response.json({
      status: res.status,
      ok: res.ok,
      url: testUrl.replace(key, "***"),
      preview: text.slice(0, 200),
    });
  } catch (e: unknown) {
    return Response.json({ error: String(e), url: testUrl.replace(key, "***") });
  }
}
