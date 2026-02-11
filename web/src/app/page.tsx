"use client";

import { useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { LandingSearch } from "@/components/LandingSearch";
import { MouseGlow } from "@/components/MouseGlow";
import { StatsRow } from "@/components/StatsRow";
import { TrendingPlugins } from "@/components/TrendingPlugins";

export default function HomePage() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.marginBottom = "0";

    return () => {
      document.body.style.overflow = "";
      document.body.style.marginBottom = "";
    };
  }, []);

  return (
    <div className="isolate relative flex flex-col items-center gap-3 md:gap-4 -mt-[60px] pt-[calc(60px+1.5rem)] md:pt-[calc(60px+3rem)] h-screen overflow-hidden">
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
      <LandingSearch />
      <StatsRow />
      <TrendingPlugins />
    </div>
  );
}
