"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Star,
  GitFork,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FlaskConical,
  Code2,
  Rocket,
  ClipboardList,
  Search,
  Layout,
  Server,
  Database,
  Container,
  Users,
  GitBranch,
  Shield,
  FileText,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatNumber } from "@/lib/data";
import type { TechStack, Capability } from "@/lib/types";

// Icon mapping based on capabilities
const CAPABILITY_ICONS: Record<Capability, LucideIcon> = {
  'testing': FlaskConical,
  'review': Code2,
  'devops': Rocket,
  'documentation': FileText,
  'orchestration': GitBranch,
  'memory': Database,
  'browser-automation': Search,
  'boilerplate': Layout,
};

// Icon mapping based on tech stack
const TECH_ICONS: Record<TechStack, LucideIcon> = {
  'nextjs': Layout,
  'react': Layout,
  'vue': Layout,
  'python': Server,
  'node': Server,
  'typescript': Code2,
  'go': Server,
  'rust': Server,
  'supabase': Database,
  'aws': Container,
  'docker': Container,
  'postgres': Database,
};

// Get the best icon for a marketplace based on its categories
function getMarketplaceIcon(
  techStack: TechStack[] = [],
  capabilities: Capability[] = []
): LucideIcon {
  // Priority: capability > tech stack > default
  for (const cap of capabilities) {
    if (CAPABILITY_ICONS[cap]) return CAPABILITY_ICONS[cap];
  }
  for (const tech of techStack) {
    if (TECH_ICONS[tech]) return TECH_ICONS[tech];
  }
  return Store;
}

// Format relative time (e.g., "2d ago", "3mo ago")
function formatRelativeTime(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export interface MarketplaceCardProps {
  marketplace: {
    name: string;
    description: string | null;
    keywords: string[];
    techStack?: TechStack[];
    capabilities?: Capability[];
    repo_full_name?: string;
    signals: {
      stars: number;
      forks: number;
      pushed_at?: string | null;
    };
  };
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
}

export function MarketplaceCard({
  marketplace,
  author_id,
  author_display_name,
  author_avatar_url,
}: MarketplaceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const marketplaceUrl = `/${author_id}/${marketplace.name}`;

  // Generate install command from repo_full_name
  const installCommand = marketplace.repo_full_name
    ? `/plugin marketplace add ${marketplace.repo_full_name}`
    : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!installCommand) return;

    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded(!expanded);
  };

  // Get the appropriate icon based on categories
  const Icon = getMarketplaceIcon(
    marketplace.techStack,
    marketplace.capabilities
  );

  return (
    <div className="group/card card p-3 flex flex-col relative w-full transition-colors hover:!bg-[var(--card)]">
      {/* Link covers the card */}
      <Link
        href={marketplaceUrl}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-lg"
        aria-label={`View ${marketplace.name} marketplace by ${author_display_name}`}
      />

      {/* Main content wrapper */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-2 relative z-10 pointer-events-none">
          <h3 className="text-sm font-semibold text-[var(--foreground)] truncate text-left mb-1">
            {marketplace.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {author_avatar_url ? (
              <Image
                src={author_avatar_url}
                alt={author_display_name}
                width={20}
                height={20}
                loading="lazy"
                className="rounded-full border border-gray-300 w-5 h-5"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--background-tertiary)] border border-gray-300" />
            )}
            <span className="text-xs text-[var(--foreground-secondary)] truncate font-[family-name:var(--font-ibm)]">
              @{author_id}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="description-scroll bg-gray-100/40 border border-gray-200/70 rounded px-2.5 py-2 mb-2.5 relative z-10 pointer-events-auto h-[60px] overflow-y-auto">
          <p className="text-[10px] sm:text-[11px] font-normal text-[var(--foreground)]/90 leading-relaxed">
            {marketplace.description || "No description"}
          </p>
        </div>

        {/* Stats: Stars + Forks + Updated */}
        <div className="flex items-center gap-2 text-xs mb-2 relative z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 text-gray-500">
            <Star
              className="w-4 h-4"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium">Stars</span>
            <span className="bg-gray-200 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-gray-700 font-[family-name:var(--font-jetbrains)]">
              {formatNumber(marketplace.signals.stars)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 text-gray-500">
            <GitFork
              className="w-4 h-4"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium">Forks</span>
            <span className="bg-gray-200 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-gray-700 font-[family-name:var(--font-jetbrains)]">
              {formatNumber(marketplace.signals.forks)}
            </span>
          </span>
          {marketplace.signals.pushed_at && (
            <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1 text-gray-500">
              <Calendar
                className="w-4 h-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium">Updated</span>
              <span className="bg-gray-200 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-gray-700 font-[family-name:var(--font-jetbrains)] whitespace-nowrap">
                {formatRelativeTime(marketplace.signals.pushed_at)}
              </span>
            </span>
          )}
        </div>

      </div>

      {/* Install command section - at bottom, clicking toggles expand/collapse */}
      {installCommand && (
        <div
          className="group/install mt-auto pt-3 relative z-20 pointer-events-auto border-t border-[var(--border)] cursor-pointer transition-all hover:!shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
          onClick={toggleExpanded}
          onKeyDown={(e) => e.key === 'Enter' && toggleExpanded(e as unknown as React.MouseEvent)}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between w-full text-[11px] font-[family-name:var(--font-jetbrains)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
            <span>Install</span>
            {expanded ? (
              <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
            )}
          </div>
          {expanded && (
            <div className="mt-2 bg-[var(--background-tertiary)] rounded px-2 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-2">
                <code className="flex-1 text-[10px] font-[family-name:var(--font-jetbrains)] text-[var(--foreground-secondary)] break-all leading-relaxed">
                  {installCommand}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1 rounded hover:bg-[var(--background-secondary)] transition-colors"
                  title={copied ? "Copied!" : "Copy to clipboard"}
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                  ) : (
                    <Copy className="w-3 h-3 text-[var(--foreground-muted)]" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
