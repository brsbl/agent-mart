"use client";

import { useState, useEffect } from "react";
import type { MarketplacesData } from "@/lib/types";

interface StatsRowProps {
  data: MarketplacesData | null;
  loading: boolean;
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
    let frameId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (target - startValue) * easeOut);

      setCurrent(currentValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return current;
}

function StatCard({ value, label, animate = true }: StatCardProps) {
  const displayValue = useAnimatedNumber(animate ? value : 0, 1200);
  const finalValue = animate ? displayValue : value;

  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-xl md:text-[30px] font-mono font-bold tracking-tight tabular-nums text-gray-600 dark:text-gray-600">
        {finalValue.toLocaleString()}
      </span>
      <span className="text-[10px] md:text-[14px] font-mono font-bold tracking-tight text-foreground-secondary uppercase">
        {label}
      </span>
    </div>
  );
}

export function StatsRow({ data, loading }: StatsRowProps) {
  const meta = data?.meta;

  const totalMarketplaces = meta?.total_marketplaces ?? 0;
  const totalPlugins = meta?.total_plugins ?? 0;
  const totalAuthors = meta?.total_authors ?? 0;

  if (loading) {
    return (
      <section className="flex justify-center">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 px-4 py-2">
          {["Authors", "Marketplaces", "Plugins"].map((label) => (
            <div key={label} className="flex flex-col items-center px-3 py-1.5">
              <div className="h-6 md:h-8 w-12 md:w-16 bg-foreground/10 rounded animate-pulse" />
              <span className="text-[10px] md:text-[14px] font-mono font-bold tracking-tight text-foreground-secondary uppercase mt-1">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-4 md:gap-8 px-4 py-2">
        <StatCard value={totalAuthors} label="Authors" />
        <StatCard value={totalMarketplaces} label="Marketplaces" />
        <StatCard value={totalPlugins} label="Plugins" />
      </div>
    </section>
  );
}
