"use client";

import { useState, useEffect } from "react";
import { useFetch } from "@/hooks";
import { DATA_URLS } from "@/lib/constants";
import type { Meta, BrowseMarketplace } from "@/lib/types";

interface MarketplacesData {
  meta: Meta;
  marketplaces: BrowseMarketplace[];
}

interface StatCardProps {
  value: number;
  label: string;
  animate?: boolean;
}

function useAnimatedNumber(target: number, duration: number = 1500) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) return;

    const startTime = Date.now();
    const startValue = Math.max(0, target - Math.floor(target * 0.1)); // Start at 90% of target

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (target - startValue) * easeOut);

      setCurrent(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

function StatCard({ value, label, animate = true }: StatCardProps) {
  const displayValue = useAnimatedNumber(animate ? value : 0, 1200);
  const finalValue = animate ? displayValue : value;

  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-xl md:text-2xl font-mono font-bold tracking-tight tabular-nums text-foreground">
        {finalValue.toLocaleString()}
      </span>
      <span className="text-xs font-mono font-bold tracking-tight text-foreground-secondary uppercase">
        {label}
      </span>
    </div>
  );
}

export function StatsRow() {
  const { data, loading } = useFetch<MarketplacesData>(
    DATA_URLS.MARKETPLACES_BROWSE,
    "Failed to load stats."
  );

  const meta = data?.meta;

  const totalMarketplaces = meta?.total_marketplaces ?? 0;
  const totalPlugins = meta?.total_plugins ?? 0;
  const totalSkills = totalPlugins;

  if (loading) {
    return (
      <section className="flex justify-center py-2">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 bg-card/80 backdrop-blur-md rounded-xl px-4 py-2 backdrop-blur-sm">
          <StatCard value={0} label="Marketplaces" animate={false} />
          <StatCard value={0} label="Plugins" animate={false} />
          <StatCard value={0} label="Skills" animate={false} />
        </div>
      </section>
    );
  }

  return (
    <section className="flex justify-center -mt-2 pt-4">
      <div className="flex flex-wrap justify-center gap-4 md:gap-8 bg-card/80 backdrop-blur-md rounded-xl px-4 py-2 backdrop-blur-sm">
        <StatCard value={totalMarketplaces} label="Marketplaces" />
        <StatCard value={totalPlugins} label="Plugins" />
        <StatCard value={totalSkills} label="Skills" />
      </div>
    </section>
  );
}
