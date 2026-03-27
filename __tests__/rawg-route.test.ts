import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookupRawgImage, rawgCache } from "@/lib/rawg";

describe("lookupRawgImage", () => {
  beforeEach(() => { rawgCache.clear(); vi.resetAllMocks(); });

  it("returns null when RAWG_API_KEY is not set", async () => {
    const orig = process.env.RAWG_API_KEY;
    delete process.env.RAWG_API_KEY;
    expect(await lookupRawgImage("Elden Ring")).toBeNull();
    process.env.RAWG_API_KEY = orig;
  });

  it("returns image URL from RAWG response", async () => {
    process.env.RAWG_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ background_image: "https://media.rawg.io/elden.jpg" }] }),
    } as Response);
    expect(await lookupRawgImage("Elden Ring")).toBe("https://media.rawg.io/elden.jpg");
  });

  it("caches to avoid duplicate API calls", async () => {
    process.env.RAWG_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ background_image: "https://media.rawg.io/elden.jpg" }] }),
    } as Response);
    await lookupRawgImage("Elden Ring");
    await lookupRawgImage("Elden Ring");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when no results", async () => {
    process.env.RAWG_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ results: [] }),
    } as Response);
    expect(await lookupRawgImage("Unknown XYZ")).toBeNull();
  });

  it("returns null on fetch error", async () => {
    process.env.RAWG_API_KEY = "test-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    expect(await lookupRawgImage("Elden Ring")).toBeNull();
  });
});
