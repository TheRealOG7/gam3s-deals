"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DealCard } from "@/components/DealCard";
import { EpicFreeCard } from "@/components/EpicFreeCard";
import { DealSection } from "@/components/DealSection";
import { timeAgo } from "@/lib/deals";
import type { Deal, DealsData, EgsData } from "@/lib/deals";

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

function useImages(titles: string[]): Record<string, string | null> {
  const [images, setImages] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!titles.length) return;
    titles.forEach((title) => {
      getImage(title).then((img) => {
        setImages((prev) => ({ ...prev, [title]: img }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titles.join(",")]);
  return images;
}

function dedupeDeals(deals: Deal[]): Deal[] {
  const seen = new Set<string>();
  return deals.filter((d) => {
    const key = d.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface DealsClientProps {
  deals: DealsData | null;
  egs: EgsData | null;
}

export function DealsClient({ deals, egs }: DealsClientProps) {
  // Collect all seen titles globally to avoid cross-section duplication
  const seenTitles = new Set<string>();

  function filterSeen(list: Deal[]): Deal[] {
    return (list ?? []).filter((d) => {
      const key = d.title.toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
  }

  const bestDeals = deals
    ? filterSeen(dedupeDeals([...(deals.best_deals ?? []), ...(deals.gog_deals ?? [])]))
    : [];
  const biggestDiscounts = deals ? filterSeen(deals.biggest_discounts ?? []) : [];
  const topRated = deals ? filterSeen(deals.top_rated ?? []) : [];
  const aaadeals = deals ? filterSeen(deals.aaa_deals ?? []) : [];
  const psDeals = deals ? filterSeen(deals.ps_deals ?? []) : [];

  const epicGames = egs ? [...(egs.current_free ?? []), ...(egs.upcoming_free ?? [])] : [];

  const allDealTitles = [
    ...bestDeals, ...biggestDiscounts, ...topRated, ...aaadeals, ...psDeals,
  ].map((d) => d.title);
  const epicTitles = epicGames.map((g) => g.title);

  const dealImages = useImages(allDealTitles);
  const epicImages = useImages(epicTitles);

  if (!deals && !egs) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 14 }}>
        No deals data available right now. Check back soon.
      </div>
    );
  }

  return (
    <>
      {deals?.updated && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          Updated {timeAgo(deals.updated)}
        </div>
      )}

      {epicGames.length > 0 && (
        <DealSection
          logo={<Image src="/logos/epic.png" alt="Epic Games" width={72} height={22} unoptimized style={{ objectFit: "contain" }} />}
          badge="Free This Week"
          badgeColor="dim"
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

      {bestDeals.length > 0 && (
        <DealSection title="Best Deals">
          {bestDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={dealImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {biggestDiscounts.length > 0 && (
        <DealSection title="Biggest Discounts">
          {biggestDiscounts.map((d) => (
            <DealCard key={d.title} deal={d} image={dealImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {topRated.length > 0 && (
        <DealSection title="Top Rated on Sale" badge="★ 85%+" badgeColor="dim">
          {topRated.map((d) => (
            <DealCard key={d.title} deal={d} image={dealImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {aaadeals.length > 0 && (
        <DealSection title="AAA on Sale">
          {aaadeals.map((d) => (
            <DealCard key={d.title} deal={d} image={dealImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}

      {psDeals.length > 0 && (
        <DealSection
          logo={<Image src="/logos/playstation.png" alt="PlayStation" width={110} height={22} unoptimized style={{ objectFit: "contain" }} />}
          title="Deals"
        >
          {psDeals.map((d) => (
            <DealCard key={d.title} deal={d} image={dealImages[d.title] ?? null} />
          ))}
        </DealSection>
      )}
    </>
  );
}
