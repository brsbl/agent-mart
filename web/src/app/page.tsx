"use client";

import { useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { StatsRow } from "@/components/StatsRow";
import { LandingSearch } from "@/components/LandingSearch";
import { TrendingPlugins } from "@/components/TrendingPlugins";

export default function HomePage() {
  // Prevent scroll on landing page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.marginBottom = "0";

    return () => {
      document.body.style.overflow = "";
      document.body.style.marginBottom = "";
    };
  }, []);

  return (
    <>
      {/* Background image - covers full viewport including navbar/footer */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-80 dark:opacity-80 pointer-events-none z-0"
        style={{ backgroundImage: "url('/agent-mart.png')" }}
      />

      {/* Content container - no scroll */}
      <div className="h-[calc(100vh-120px)] flex flex-col relative z-10">
        {/* Content */}
        <div className="flex flex-col flex-1 pt-8">
          <div className="pb-8">
            <HeroSection />
            <StatsRow />
          </div>
          {/* Search and content below the sign */}
          <div className="flex flex-col gap-2 -mb-4">
            <LandingSearch />
            <TrendingPlugins />
          </div>
        </div>
      </div>
    </>
  );
}
