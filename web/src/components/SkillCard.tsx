"use client";

import Link from "next/link";
import { Sparkles, Star } from "lucide-react";
import type { FlatSkill } from "@/lib/types";
import { formatNumber } from "@/lib/data";

interface SkillCardProps {
  skill: FlatSkill;
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link
      href={`/plugin/${skill.owner_id}/${skill.plugin_name}`}
      className="block"
    >
      <article className="card p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-semibold text-[var(--foreground)]">
              {skill.name}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--foreground-secondary)] line-clamp-2 mb-3">
          {skill.description || "No description"}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <span className="truncate">
            {skill.plugin_name} &middot; {skill.repo_full_name}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-3 h-3" />
            {formatNumber(skill.stars)}
          </span>
        </div>
      </article>
    </Link>
  );
}
