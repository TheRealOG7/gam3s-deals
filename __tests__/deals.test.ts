import { describe, it, expect, vi, beforeEach } from "vitest";
import { timeAgo, mergeDeals, fetchDeals } from "@/lib/deals";
import type { Deal } from "@/lib/deals";

const makeDeal = (title: string, savings_pct: number): Deal => ({
  title, sale_price: "1.00", normal_price: "10.00",
  savings_pct, deal_url: "https://example.com", expiry: null,
});

describe("timeAgo", () => {
  it("returns minutes ago for recent timestamps", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(timeAgo(twoMinutesAgo)).toBe("2 minutes ago");
  });
  it("returns hours ago for older timestamps", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3 hours ago");
  });
  it("returns unknown for null", () => {
    expect(timeAgo(null)).toBe("unknown");
  });
});

describe("mergeDeals", () => {
  it("deduplicates by title case-insensitively", () => {
    const a = [makeDeal("Elden Ring", 78)];
    const b = [makeDeal("elden ring", 70)];
    expect(mergeDeals(a, b)).toHaveLength(1);
  });
  it("sorts by savings_pct descending", () => {
    const a = [makeDeal("A", 50), makeDeal("B", 90)];
    expect(mergeDeals(a, [])[0].savings_pct).toBe(90);
  });
});

describe("DealsData shape", () => {
  it("has ig_deals field", () => {
    const data: import("@/lib/deals").DealsData = {
      updated: "", pc_source: "",
      best_deals: [], biggest_discounts: [], top_rated: [],
      aaa_deals: [], gog_deals: [], ps_deals: [],
      ig_deals: [], eneba_deals: [],
    };
    expect(Array.isArray(data.ig_deals)).toBe(true);
  });
  it("has eneba_deals field", () => {
    const data: import("@/lib/deals").DealsData = {
      updated: "", pc_source: "",
      best_deals: [], biggest_discounts: [], top_rated: [],
      aaa_deals: [], gog_deals: [], ps_deals: [],
      ig_deals: [], eneba_deals: [],
    };
    expect(Array.isArray(data.eneba_deals)).toBe(true);
  });
});

describe("fetchDeals", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    expect(await fetchDeals("https://example.com")).toBeNull();
  });
  it("returns null on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    expect(await fetchDeals("https://example.com")).toBeNull();
  });
});
