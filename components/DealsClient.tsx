"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DealCard } from "@/components/DealCard";
import { EpicFreeCard } from "@/components/EpicFreeCard";
import { DealSection } from "@/components/DealSection";
import { mergeDeals, timeAgo } from "@/lib/deals";
import type { Deal, DealsData, EgsData, EpicGame } from "@/lib/deals";

async function getImage(title: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/rawg?q=${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.image ?? null;
  } catch {
    return null;
  }
}

function useDealImages(deals: Deal[]): Record<string, string | null> {
  const [images, setImages] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!deals.length) return;
    deals.forEach((deal) => {
      getImage(deal.title).then((img) => {
        setImages((prev) => ({ ...prev, [deal.title]: img }));
      });
    });
  }, [deals]);
  return images;
}

function useEpicImages(games: EpicGame[]): Record<string, string | null> {
  const [images, setImages] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!games.length) return;
    games.forEach((g) => {
      getImage(g.title).then((img) => {
        setImages((prev) => ({ ...prev, [g.title]: img }));
      });
    });
  }, [games]);
  return images;
}

interface DealsClientProps {
  deals: DealsData | null;
  egs: EgsData | null;
}

export function DealsClient({ deals, egs }: DealsClientProps) {
  const bestDeals = deals ? mergeDeals(deals.best_deals, deals.gog_deals) : [];
  const epicGames = egs ? [...(egs.current_free ?? []), ...(egs.upcoming_free ?? [])] : [];

  const bestImages = useDealImages(bestDeals);
  const discountImages = useDealImages(deals?.biggest_discounts ?? []);
  const ratedImages = useDealImages(deals?.top_rated ?? []);
  const aaaImages = useDealImages(deals?.aaa_deals ?? []);
  const psImages = useDealImages(deals?.ps_deals ?? []);
  const epicImages = useEpicImages(epicGames);

  if (!deals && !egs) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 14 }}>
        No deals data available right now. Check back soon.
      </div>
    );
  }

  return (
    <>
      {/* Header timestamp */}
      {deals?.updated && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)", marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          Updated {timeAgo(deals.updated)}
        </div>
      )}

      {/* Free This Week — Epic */}
      {epicGames.length > 0 && (
        <DealSection
          logo={<Image src="/logos/epic.svg" alt="Epic Games" width={60} height={18} unoptimized />}
          badge="Free This Week"
          badgeColor="orange"
          minCardWidth={240}
        >
          {epicGames.map((g) => (
            <EpicFreeCard
              key={g.title}
              game={g}
              isCurrent={egs?.current_free?.some((c) => c.title === g.title) ?? false}
              image={epicImages[g.title] ?? null}
            />
          ))}
        </DealSection>
      )}

      {/* Best Deals */}
      {bestDeals.length > 0 && (
        <DealSection title="Best Deals">
          {bestDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={bestImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {/* Biggest Discounts */}
      {(deals?.biggest_discounts?.length ?? 0) > 0 && (
        <DealSection title="Biggest Discounts">
          {deals!.biggest_discounts.map((d) => (
            <DealCard key={d.title} deal={d} image={discountImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {/* Top Rated */}
      {(deals?.top_rated?.length ?? 0) > 0 && (
        <DealSection title="Top Rated on Sale" badge="★ 85%+" badgeColor="dim">
          {deals!.top_rated.map((d) => (
            <DealCard key={d.title} deal={d} image={ratedImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {/* AAA on Sale */}
      {(deals?.aaa_deals?.length ?? 0) > 0 && (
        <DealSection title="AAA on Sale">
          {deals!.aaa_deals.map((d) => (
            <DealCard key={d.title} deal={d} image={aaaImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {/* PlayStation Deals */}
      {(deals?.ps_deals?.length ?? 0) > 0 && (
        <DealSection
          logo={<Image src="/logos/playstation.svg" alt="PlayStation" width={100} height={18} unoptimized />}
          title="Deals"
        >
          {deals!.ps_deals.map((d) => (
            <DealCard key={d.title} deal={d} image={psImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}
    </>
  );
}
