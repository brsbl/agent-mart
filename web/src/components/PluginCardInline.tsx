"use client";

import { useState } from "react";
import {
  getCategoryBadgeClass,
  getCategoryDisplayName,
} from "@/lib/data";
import type { Category } from "@/lib/types";

// Max categories to display on inline plugin cards
const MAX_CATEGORIES = 3;

interface PluginCardInlineProps {
  plugin: {
    name: string;
    description: string | null;
    version?: string;
    keywords?: string[];
    categories?: Category[];
  };
}

export function PluginCardInline({ plugin }: PluginCardInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const categories = plugin.categories ?? [];
  const displayCategories = expanded ? categories : categories.slice(0, MAX_CATEGORIES);
  const remainingCount = Math.max(0, categories.length - MAX_CATEGORIES);

  return (
    <div className="border border-border rounded-lg bg-card p-4 hover:border-border-hover hover:shadow-sm transition-all">
      {/* Header: Name + Version */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-foreground">
          {plugin.name}
        </h3>
        {plugin.version && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary bg-background-secondary rounded">
            v{plugin.version}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-foreground-secondary">
        {plugin.description || "No description"}
      </p>

      {/* Category Badges */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {displayCategories.map((cat) => (
            <span
              key={cat}
              className={`badge ${getCategoryBadgeClass(cat)}`}
            >
              {getCategoryDisplayName(cat)}
            </span>
          ))}
          {remainingCount > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center text-[0.8rem] font-medium text-foreground-muted hover:text-foreground-secondary self-center cursor-pointer transition-colors px-1.5 py-0.5 border border-border rounded-full hover:border-border-hover"
            >
              +{remainingCount}
            </button>
          )}
          {expanded && categories.length > MAX_CATEGORIES && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center text-[0.8rem] font-medium text-foreground-muted hover:text-foreground-secondary self-center cursor-pointer transition-colors px-1.5 py-0.5 border border-border rounded-full hover:border-border-hover"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
