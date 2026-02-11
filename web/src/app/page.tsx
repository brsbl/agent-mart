"use client";

import { HeroSection } from "@/components/HeroSection";
import { LandingSearch } from "@/components/LandingSearch";
import { MouseGlow } from "@/components/MouseGlow";
import { StatsRow } from "@/components/StatsRow";
import { TrendingPlugins } from "@/components/TrendingPlugins";
import { useFetch } from "@/hooks";
import { DATA_URLS } from "@/lib/constants";
import type { MarketplacesData } from "@/lib/types";

export default function HomePage() {
  const { data, loading } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load marketplace data."
  );

  return (
    <div className="isolate relative flex flex-col items-center gap-3 md:gap-4 -mt-[60px] pt-[calc(60px+1.5rem)] md:pt-[calc(60px+3rem)] min-h-screen overflow-y-auto">
      <MouseGlow />
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <HeroSection />
      <LandingSearch data={data} />
      <StatsRow data={data} loading={loading} />
      <TrendingPlugins data={data} loading={loading} />
    </div>
  );
}
