"use client";

import Image from "next/image";
import { DealCard } from "@/components/DealCard";
import { EpicFreeCard } from "@/components/EpicFreeCard";
import { PsPlusCard } from "@/components/PsPlusCard";
import { GamePassCard } from "@/components/GamePassCard";
import { DealSection } from "@/components/DealSection";
import type { Deal, DealsData, EgsData, PsGame, GamePassGame } from "@/lib/deals";

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
  reviews: Record<string, { text: string; count: number } | null>;
  totalSavings: number;
  dealCount: number;
  psGames: PsGame[];
  gamePassGames: GamePassGame[];
}

export function DealsClient({ deals, egs, images, urls, reviews, totalSavings, dealCount, psGames, gamePassGames }: DealsClientProps) {
  const allSections = deals ? [
    deals.best_deals, deals.gog_deals, deals.biggest_discounts,
    deals.top_rated, deals.aaa_deals, deals.ps_deals,
    deals.ig_deals, deals.eneba_deals,
  ] : [];

  const bestMap = buildBestDeals(allSections);

  // Review text → quality score (0–100)
  const REVIEW_SCORES: Record<string, number> = {
    "Overwhelmingly Positive": 95, "Very Positive": 85, "Mostly Positive": 70,
    "Positive": 65, "Mixed": 50, "Mostly Negative": 30, "Negative": 20,
    "Very Negative": 10, "Overwhelmingly Negative": 5,
  };
  const qualityScore = (deal: Deal): number => {
    const rev = reviews[deal.title];
    if (rev?.text && REVIEW_SCORES[rev.text] !== undefined) return REVIEW_SCORES[rev.text];
    if (deal.steam_rating != null) return deal.steam_rating;
    return 55; // neutral when no data
  };

  // Best Deals: quality × discount hybrid — highly rated games with a meaningful sale
  const sortByQualityDiscount = (arr: Deal[]) => [...arr].sort((a, b) => {
    const scoreA = qualityScore(a) * 0.55 + a.savings_pct * 0.45;
    const scoreB = qualityScore(b) * 0.55 + b.savings_pct * 0.45;
    return scoreB - scoreA;
  });
  // Biggest Discounts: highest absolute dollar saved (not %) — filters out $2 game at 100% off
  const sortByDollarSaved = (arr: Deal[]) => [...arr].sort((a, b) => {
    const aSaved = parseFloat(a.normal_price || "0") - parseFloat(a.sale_price || "0");
    const bSaved = parseFloat(b.normal_price || "0") - parseFloat(b.sale_price || "0");
    return bSaved - aSaved;
  });
  // AAA: dollar savings
  const sortByDollarSavings = (arr: Deal[]) => [...arr].sort((a, b) => {
    const aSaved = (a.savings_pct / 100) * parseFloat(a.normal_price || "0");
    const bSaved = (b.savings_pct / 100) * parseFloat(b.normal_price || "0");
    return bSaved - aSaved;
  });

  const bestDealsPool = sortByQualityDiscount([
    ...(deals?.best_deals ?? []), ...(deals?.gog_deals ?? []),
    ...(deals?.ig_deals ?? []), ...(deals?.eneba_deals ?? []),
  ]);
  const biggestDiscountsPool = sortByDollarSaved([
    ...(deals?.biggest_discounts ?? []),
    ...(deals?.ig_deals ?? []), ...(deals?.eneba_deals ?? []),
  ]);
  const aaaPool = sortByDollarSavings([
    ...(deals?.aaa_deals ?? []),
    ...(deals?.ig_deals ?? []), ...(deals?.eneba_deals ?? []),
  ]);

  const bestDeals = deals ? filterBest(bestDealsPool, bestMap) : [];
  const aaadeals = deals ? filterBest(aaaPool, bestMap) : [];
  const psDeals = deals ? filterBest(deals.ps_deals ?? [], bestMap) : [];
  const biggestDiscounts = deals ? filterBest(biggestDiscountsPool, bestMap) : [];
  const igDeals = deals ? filterBest(deals.ig_deals ?? [], bestMap) : [];
  const enebaDeals = deals ? filterBest(deals.eneba_deals ?? [], bestMap) : [];

  const epicGames = egs ? [...(egs.current_free ?? []), ...(egs.upcoming_free ?? [])] : [];

  if (!deals && !egs) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 14 }}>
        No deals data available right now. Check back soon.
      </div>
    );
  }

  return (
    <>
      {totalSavings >= 1 && (
        <div className="savings-banner">
          <span style={{
            fontSize: 13, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.06em", color: "var(--text)", marginRight: 8,
          }}>
            Total Savings this Week:
          </span>
          <span className="savings-badge" style={{
            display: "inline-block", fontSize: 13, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "5px 16px", borderRadius: 5,
            background: "var(--green)", color: "#000",
          }}>
            {`$${Math.round(totalSavings).toLocaleString()} across ${dealCount} games`}
          </span>
        </div>
      )}

      {(epicGames.length > 0 || psGames.length > 0) && (
        <div className="free-games-row" style={{ display: "flex", gap: 24, marginBottom: 36, alignItems: "flex-start" }}>
          {epicGames.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <DealSection
                logo={<Image src="/logos/epic.png" alt="Epic Games" width={64} height={18} unoptimized style={{ objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                badge="Free This Week"
                badgeColor="dim"
                style={{ marginBottom: 0 }}
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
            </div>
          )}
          {psGames.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <DealSection
                logo={<Image src="/logos/playstation.png" alt="PlayStation" width={32} height={32} unoptimized style={{ width: 32, height: 32, objectFit: "contain", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                badge="Free with PS Plus"
                badgeColor="dim"
                style={{ marginBottom: 0 }}
              >
                {psGames.map((g) => (
                  <PsPlusCard key={g.title} game={g} image={images[g.title] ?? null} />
                ))}
              </DealSection>
            </div>
          )}
        </div>
      )}

      {gamePassGames.length > 0 && (
        <DealSection
          logo={<Image src="/logos/gamepass.png" alt="Game Pass" width={140} height={34} unoptimized style={{ height: 34, width: "auto", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          allPassGames={gamePassGames}
        >
          {gamePassGames.slice(0, 25).map((g) => (
            <GamePassCard key={g.title} game={g} />
          ))}
        </DealSection>
      )}

      {bestDeals.length > 0 && (
        <DealSection title="Best Deals" allDeals={bestDealsPool} resolvedUrls={urls} resolvedReviews={reviews}>
          {bestDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {aaadeals.length > 0 && (
        <DealSection title="AAA on Sale" allDeals={aaaPool} resolvedUrls={urls} resolvedReviews={reviews}>
          {aaadeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {psDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/playstation.png" alt="PlayStation" width={32} height={32} unoptimized style={{ width: 32, height: 32, objectFit: "contain", display: "block" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          title="Deals"
          allDeals={deals?.ps_deals ?? []}
          resolvedUrls={urls}
          resolvedReviews={reviews}
        >
          {psDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {biggestDiscounts.length > 0 && (
        <DealSection title="Biggest Discounts" allDeals={biggestDiscountsPool} resolvedUrls={urls} resolvedReviews={reviews}>
          {biggestDiscounts.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {igDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/instant-gaming.png" alt="Instant Gaming" width={16} height={16} unoptimized style={{ width: 16, height: 16, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          title="Deals"
          allDeals={deals?.ig_deals ?? []}
          resolvedUrls={urls}
          resolvedReviews={reviews}
        >
          {igDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {enebaDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/eneba.png" alt="Eneba" width={16} height={16} unoptimized style={{ width: 16, height: 16, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          title="Deals"
          allDeals={deals?.eneba_deals ?? []}
          resolvedUrls={urls}
          resolvedReviews={reviews}
        >
          {enebaDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={images[d.title] ?? null} href={urls[d.title] ?? d.deal_url} review={reviews[d.title] ?? null} />
          ))}
        </DealSection>
      )}
    </>
  );
}
