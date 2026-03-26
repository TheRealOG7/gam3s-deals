"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DealCard } from "@/components/DealCard";
import { EpicFreeCard } from "@/components/EpicFreeCard";
import { DealSection } from "@/components/DealSection";
import { fetchDeals, fetchEgsGames, mergeDeals, timeAgo } from "@/lib/deals";
import type { Deal, DealsData, EgsData, EpicGame } from "@/lib/deals";

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "";

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

export default function DealsPage() {
  const [deals, setDeals] = useState<DealsData | null>(null);
  const [egs, setEgs] = useState<EgsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDeals(DASHBOARD_URL), fetchEgsGames(DASHBOARD_URL)]).then(([d, e]) => {
      setDeals(d);
      setEgs(e);
      setLoading(false);
    });
  }, []);

  const bestDeals = deals ? mergeDeals(deals.best_deals, deals.gog_deals) : [];
  const epicGames = egs ? [...(egs.current_free ?? []), ...(egs.upcoming_free ?? [])] : [];

  const bestImages = useDealImages(bestDeals);
  const discountImages = useDealImages(deals?.biggest_discounts ?? []);
  const ratedImages = useDealImages(deals?.top_rated ?? []);
  const aaaImages = useDealImages(deals?.aaa_deals ?? []);
  const psImages = useDealImages(deals?.ps_deals ?? []);
  const epicImages = useEpicImages(epicGames);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 24px 60px" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingBottom: 18, marginBottom: 28, borderBottom: "1px solid var(--border)",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 16, color: "#000",
          }}>
            G
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>GAM3S.GG Deals</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Best game deals updated daily</div>
          </div>
        </div>
        {deals?.updated && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Updated {timeAgo(deals.updated)}
          </div>
        )}
      </header>

      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)", fontSize: 14 }}>
          Loading deals...
        </div>
      )}

      {!loading && (
        <>
          {/* Free This Week — Epic */}
          {epicGames.length > 0 && (
            <DealSection
              logo={<Image src="/logos/epic.svg" alt="Epic Games" width={60} height={18} unoptimized />}
              badge="Free This Week"
              badgeColor="orange"
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
      )}
    </main>
  );
}
