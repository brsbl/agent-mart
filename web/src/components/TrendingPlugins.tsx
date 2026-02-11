"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFetch } from "@/hooks";
import { DATA_URLS } from "@/lib/constants";
import { formatNumber } from "@/lib/data";
import type { Meta, BrowseMarketplace } from "@/lib/types";
import { Star, TrendingUp, ChevronRight, ChevronLeft } from "lucide-react";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

interface TrendingCardProps {
  marketplace: BrowseMarketplace;
}

function TrendingCard({ marketplace }: TrendingCardProps) {
  const repoName = marketplace.repo_full_name?.split('/')[1] || marketplace.name;
  const marketplaceUrl = `/${marketplace.author_id}/${repoName}`;
  const starsGained = marketplace.signals?.stars_gained_7d ?? 0;

  return (
    <Link
      href={marketplaceUrl}
      className="flex-shrink-0 w-[220px] border border-border rounded-xl hover:border-border-hover hover:shadow-md transition-all bg-card p-4 group"
    >
      {/* Author info */}
      <div className="flex items-center gap-2 mb-3">
        {marketplace.author_avatar_url ? (
          <Image
            src={marketplace.author_avatar_url}
            alt={marketplace.author_display_name}
            width={24}
            height={24}
            loading="lazy"
            className="w-6 h-6 rounded-full border border-border"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-background-secondary border border-border" />
        )}
        <span className="text-xs text-foreground-secondary font-mono truncate">
          @{marketplace.author_id}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground-secondary transition-colors truncate mb-2">
        {marketplace.name}
      </h3>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-foreground-secondary">
        <span className="flex items-center gap-1">
          <Star size={12} className="text-yellow-500" fill="currentColor" />
          {formatNumber(marketplace.signals?.stars ?? 0)}
        </span>
        {starsGained > 0 && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={12} />
            +{formatNumber(starsGained)}
          </span>
        )}
      </div>
    </Link>
  );
}

const CARD_WIDTH = 220;
const GAP = 16;
const CARD_STEP = CARD_WIDTH + GAP;

export function TrendingPlugins() {
  const [scrollIndex, setScrollIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(
    typeof window !== "undefined" && window.innerWidth >= 768 ? 3 : 1
  );

  const { data, loading } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load trending plugins."
  );

  // Sort by trending_score and take top 10
  const trendingMarketplaces = data?.marketplaces
    ?.slice()
    .sort((a, b) => (b.signals?.trending_score ?? 0) - (a.signals?.trending_score ?? 0))
    .slice(0, 10) ?? [];

  // 1 card on mobile, 3 on md+
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = (matches: boolean) => {
      setVisibleCount(matches ? 3 : 1);
      setScrollIndex(0);
    };
    update(mq.matches);
    const handler = (e: MediaQueryListEvent) => update(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const maxIndex = Math.max(0, trendingMarketplaces.length - visibleCount);

  const scroll = useCallback((direction: "left" | "right") => {
    setScrollIndex(prev => {
      if (direction === "right") {
        return prev >= maxIndex ? 0 : prev + 1;
      }
      return prev <= 0 ? maxIndex : prev - 1;
    });
  }, [maxIndex]);

  // Exact pixel width that fits only complete cards
  const windowWidth = visibleCount * CARD_WIDTH + Math.max(0, visibleCount - 1) * GAP;

  if (loading) {
    return (
      <section className="py-4 flex-1 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4 px-4">
            <div className="flex items-center gap-2.5 px-4 py-2">
              <TrendingUp size={22} className="text-accent" />
              <h2 className="text-base font-semibold text-foreground">Trending This Week</h2>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto md:justify-center pb-2 px-4 scrollbar-hide">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[220px] h-[120px] border border-border rounded-xl bg-card animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (trendingMarketplaces.length === 0) {
    return null;
  }

  return (
    <section className="pt-4 md:pt-2 py-2 flex-1 w-full overflow-hidden">
      <div className="mx-auto w-fit">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4 mt-4 px-4">
          <div className="flex items-center gap-2.5 px-4 py-2 pb-3">
            <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base md:text-[20px] font-semibold text-foreground">Trending This Week</h2>
          </div>
        </div>

        {/* Carousel with arrows (all breakpoints) */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="shrink-0 p-1.5 md:p-2 rounded-full bg-background/30 backdrop-blur-md hover:bg-background/50 shadow-md transition-all border border-border"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} className="text-foreground md:w-5 md:h-5" />
          </button>

          {/* Cards window with frosted container */}
          <div className="px-3 md:px-4 py-3 md:py-4 bg-card/30 backdrop-blur-md border border-border rounded-2xl">
            <div
              className="overflow-hidden"
              style={{ width: windowWidth }}
            >
              <div
                className="flex gap-4 transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${scrollIndex * CARD_STEP}px)` }}
              >
                {trendingMarketplaces.map((marketplace) => (
                  <TrendingCard
                    key={marketplace.repo_full_name || `${marketplace.author_id}-${marketplace.name}`}
                    marketplace={marketplace}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            className="shrink-0 p-1.5 md:p-2 rounded-full bg-background/30 backdrop-blur-md hover:bg-background/50 shadow-md transition-all border border-border"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} className="text-foreground md:w-5 md:h-5" />
          </button>
        </div>

        {/* Browse all CTA */}
        <div className="flex justify-center mt-4">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[14px] text-foreground-secondary hover:text-foreground transition-colors group"
          >
            Browse All Plugins
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
