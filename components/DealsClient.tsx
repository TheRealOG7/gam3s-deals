"use client";

import Image from "next/image";
import { DealCard } from "@/components/DealCard";
import { EpicFreeCard } from "@/components/EpicFreeCard";
import { DealSection } from "@/components/DealSection";
import type { Deal, DealsData, EgsData } from "@/lib/deals";

function normalizeTitle(title: string): string {
  return title
    .replace(/\s*[-–:]\s*(deluxe|ultimate|standard|complete|gold|goty|game of the year|definitive|remastered|anniversary|enhanced|expanded|collector'?s?)\s*(edition|ed\.?)?\s*$/i, "")
    .toLowerCase()
    .trim();
}

function buildBestDeals(sections: Deal[][]): Map<string, Deal> {
  const best = new Map<string, Deal>();
  for (const section of sections) {
    for (const deal of section ?? []) {
      const key = normalizeTitle(deal.title);
      const existing = best.get(key);
      if (!existing || deal.savings_pct > existing.savings_pct) {
        best.set(key, deal);
      }
    }
  }
  return best;
}

function filterBest(section: Deal[], bestMap: Map<string, Deal>): Deal[] {
  const seen = new Set<string>();
  return (section ?? []).filter((deal) => {
    const key = normalizeTitle(deal.title);
    if (seen.has(key)) return false;
    const best = bestMap.get(key);
    if (!best || best.title !== deal.title) return false;
    seen.add(key);
    return true;
  });
}

interface DealsClientProps {
  deals: DealsData | null;
  egs: EgsData | null;
  images: Record<string, string | null>;
  urls: Record<string, string>;
  totalSavings: number;
}

export function DealsClient({ deals, egs, images, urls, totalSavings }: DealsClientProps) {
  const allSections = deals ? [
    deals.best_deals, deals.gog_deals, deals.biggest_discounts,
    deals.top_rated, deals.aaa_deals, deals.ps_deals,
  ] : [];

  const bestMap = buildBestDeals(allSections);

  const bestDeals = deals ? filterBest([...(deals.best_deals ?? []), ...(deals.gog_deals ?? [])], bestMap) : [];
  const aaadeals = deals ? filterBest(deals.aaa_deals ?? [], bestMap) : [];
  const psDeals = deals ? filterBest(deals.ps_deals ?? [], bestMap) : [];
  const biggestDiscounts = deals ? filterBest(deals.biggest_discounts ?? [], bestMap) : [];

  const epicGames = egs ? [...(egs.current_free ?? []), ...(egs.upcoming_free ?? [])] : [];

  if (!deals && !egs) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 14 }}>
        No deals data available right now. Check back soon.
      </div>
    );
  }

  const savingsLabel = totalSavings >= 1
    ? `Save up to $${Math.round(totalSavings).toLocaleString()}`
    : null;

  return (
    <>
      {savingsLabel && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 5,
            background: "var(--green)", color: "#000",
          }}>
            {savingsLabel}
          </span>
        </div>
      )}

      {epicGames.length > 0 && (
        <DealSection
          logo={<Image src="/logos/epic.png" alt="Epic Games" width={64} height={18} unoptimized style={{ objectFit: "contain" }} />}
          badge="Free This Week"
          badgeColor="dim"
        >
          {epicGames.map((g) => (
            <EpicFreeCard
              key={g.title}
              game={g}
              isCurrent={egs?.current_free?.some((c) => c.title === g.title) ?? false}
              image={images[g.title] ?? null}
            />
          ))}
        </DealSection>
      )}

      {bestDeals.length > 0 && (
        <DealSection title="Best Deals" allDeals={[...(deals?.best_deals ?? []), ...(deals?.gog_deals ?? [])]} resolvedUrls={urls}>
          {bestDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} />
          ))}
        </DealSection>
      )}

      {aaadeals.length > 0 && (
        <DealSection title="AAA on Sale" allDeals={deals?.aaa_deals ?? []} resolvedUrls={urls}>
          {aaadeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} />
          ))}
        </DealSection>
      )}

      {psDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/playstation.png" alt="PlayStation" width={60} height={18} unoptimized style={{ objectFit: "contain" }} />}
          title="Deals"
          allDeals={deals?.ps_deals ?? []}
          resolvedUrls={urls}
        >
          {psDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} />
          ))}
        </DealSection>
      )}

      {biggestDiscounts.length > 0 && (
        <DealSection title="Biggest Discounts" allDeals={deals?.biggest_discounts ?? []} resolvedUrls={urls}>
          {biggestDiscounts.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} />
          ))}
        </DealSection>
      )}
    </>
  );
}
