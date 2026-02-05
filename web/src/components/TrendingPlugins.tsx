"use client";

import { useState, useRef } from "react";
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
      className="flex-shrink-0 w-[200px] md:w-[220px] border border-border rounded-xl hover:border-border-hover hover:shadow-md transition-all bg-card p-4 group"
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

export function TrendingPlugins() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load trending plugins."
  );

  // Sort by trending_score and take top 10
  const trendingMarketplaces = data?.marketplaces
    ?.slice()
    .sort((a, b) => (b.signals?.trending_score ?? 0) - (a.signals?.trending_score ?? 0))
    .slice(0, 10) ?? [];

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const scrollAmount = 240; // card width + gap
      const maxScroll = scrollWidth - clientWidth;

      if (direction === "right") {
        // If near the end, loop to beginning
        if (scrollLeft >= maxScroll - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      } else {
        // If at the beginning, loop to end
        if (scrollLeft <= 10) {
          scrollRef.current.scrollTo({ left: maxScroll, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        }
      }
    }
  };

  if (loading) {
    return (
      <section className="py-4 flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4 px-4">
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-lg px-4 py-2 backdrop-blur-sm">
              <TrendingUp size={20} className="text-emerald-500" />
              <h2 className="text-lg font-semibold text-foreground">Trending This Week</h2>
            </div>
          </div>
          <div className="flex justify-start md:justify-center gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] md:w-[220px] h-[120px] border border-border rounded-xl bg-card animate-pulse"
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
    <section className="py-2 flex-1">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4 px-4">
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md rounded-lg px-4 py-2 backdrop-blur-sm">
            <TrendingUp size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Trending This Week</h2>
          </div>
        </div>

        {/* Trending cards carousel */}
        <div className="relative mx-12">
          {/* Left arrow */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card/80 hover:bg-card-hover/90 shadow-md transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} className="text-foreground" />
          </button>

          {/* Cards container */}
          <div className="py-2">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide px-2"
            >
              {trendingMarketplaces.map((marketplace) => (
                <TrendingCard
                  key={marketplace.repo_full_name || `${marketplace.author_id}-${marketplace.name}`}
                  marketplace={marketplace}
                />
              ))}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll("right")}
            className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card/80 hover:bg-card-hover/90 shadow-md transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>

        {/* Browse all CTA */}
        <div className="flex justify-center mt-4">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors group bg-card/80 backdrop-blur-md rounded-lg backdrop-blur-sm"
          >
            Browse All Plugins
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
