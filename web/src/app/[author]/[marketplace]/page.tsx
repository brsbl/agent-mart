"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Store,
  Star,
  GitFork,
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronRight,
  Terminal,
  Sparkles,
  Puzzle,
} from "lucide-react";
import {
  CopyableCommand,
  FileTree,
  LoadingState,
  ErrorState,
  CategoryPill,
} from "@/components";
import { useFetch } from "@/hooks";
import type { AuthorDetail, Marketplace, Plugin } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

// Expandable section component for commands and skills
interface ExpandableSectionProps {
  name: string;
  description: string;
  content: string;
}

function ExpandableSection({ name, description, content }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = content && content.trim().length > 0;

  return (
    <div className="border border-[var(--border)] rounded-lg">
      <button
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        className={`w-full p-3 text-left flex items-start gap-3 ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        disabled={!hasContent}
        aria-expanded={isExpanded}
      >
        {hasContent && (
          <span className="flex-shrink-0 mt-0.5 text-[var(--foreground-muted)]">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
        )}
        <div className={`flex-1 ${!hasContent ? "ml-7" : ""}`}>
          <code className="font-mono text-sm font-semibold text-[var(--accent)]">
            {name}
          </code>
          <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
            {description || "No description"}
          </p>
        </div>
      </button>
      {isExpanded && hasContent && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 p-3 bg-[var(--background-secondary)] rounded-lg overflow-x-auto">
            <pre className="text-xs text-[var(--foreground-secondary)] whitespace-pre-wrap font-mono">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Expandable plugin card component
interface PluginSectionProps {
  plugin: Plugin;
  defaultExpanded?: boolean;
}

function PluginSection({ plugin, defaultExpanded = false }: PluginSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasDetails = plugin.commands.length > 0 || plugin.skills.length > 0;

  return (
    <div id={plugin.name} className="card scroll-mt-24">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-start gap-4 cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0">
          <Puzzle className="w-5 h-5 text-[var(--accent)]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{plugin.name}</h3>
            <span className="text-[var(--foreground-muted)]">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-secondary)] mt-1 line-clamp-2">
            {plugin.description || "No description"}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-muted)]">
            {plugin.commands.length > 0 && (
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" aria-hidden="true" />
                {plugin.commands.length} command{plugin.commands.length !== 1 ? "s" : ""}
              </span>
            )}
            {plugin.skills.length > 0 && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                {plugin.skills.length} skill{plugin.skills.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4">
          {/* Install Command */}
          <div className="ml-14">
            <CopyableCommand command={plugin.install_commands} />
          </div>

          {/* Commands */}
          {plugin.commands.length > 0 && (
            <div className="ml-14">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 flex items-center gap-2">
                <Terminal className="w-3 h-3" aria-hidden="true" />
                Commands
              </h4>
              <div className="space-y-2">
                {plugin.commands.map((command) => (
                  <ExpandableSection
                    key={command.name}
                    name={command.name}
                    description={command.description}
                    content={command.content}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {plugin.skills.length > 0 && (
            <div className="ml-14">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)] mb-2 flex items-center gap-2">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                Skills
              </h4>
              <div className="space-y-2">
                {plugin.skills.map((skill) => (
                  <ExpandableSection
                    key={skill.name}
                    name={skill.name}
                    description={skill.description}
                    content={skill.content}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const authorId = validateUrlParam(params.author);
  const marketplaceName = validateUrlParam(params.marketplace);

  // Build URL conditionally - null if params are invalid
  const url = authorId ? DATA_URLS.AUTHOR(authorId) : null;

  const {
    data: authorData,
    loading,
    error,
  } = useFetch<AuthorDetail>(url, "Failed to load marketplace data");

  // Find the marketplace by name from author data
  const marketplace: Marketplace | null = useMemo(() => {
    if (!authorData || !marketplaceName) {
      return null;
    }

    return (
      authorData.marketplaces.find((m) => m.name === marketplaceName) ?? null
    );
  }, [authorData, marketplaceName]);

  // Generate install command for the entire marketplace
  const installCommand = useMemo(() => {
    if (!marketplace) {
      return "";
    }

    return `/plugin marketplace add ${marketplace.repo_full_name}`;
  }, [marketplace]);

  if (loading) {
    return <LoadingState />;
  }

  // Handle invalid URL params
  if (!authorId || !marketplaceName) {
    return (
      <ErrorState
        title="Marketplace Not Found"
        message="Invalid URL parameters"
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  if (error || !authorData || !marketplace) {
    return (
      <ErrorState
        title="Marketplace Not Found"
        message={error || "This marketplace does not exist."}
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  const { author } = authorData;

  return (
    <div className="container py-8">
      {/* Marketplace Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-xl bg-[var(--background-secondary)] flex items-center justify-center flex-shrink-0">
          <Store
            className="w-10 h-10 text-[var(--accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{marketplace.name}</h1>

          <p className="text-[var(--foreground-secondary)] mb-4 max-w-3xl">
            {marketplace.description || "No description"}
          </p>

          {/* Author info */}
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/${author.id}`}
              className="flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Image
                src={author.avatar_url}
                alt={author.display_name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>@{author.id}</span>
            </Link>
          </div>

          {/* Metadata: Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div className="flex items-center gap-1.5">
              <Star
                className="w-4 h-4 text-[var(--accent)]"
                aria-hidden="true"
              />
              <span className="font-semibold">
                {formatNumber(marketplace.signals.stars)}
              </span>
              <span className="text-[var(--foreground-muted)]">stars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork
                className="w-4 h-4 text-[var(--foreground-muted)]"
                aria-hidden="true"
              />
              <span className="font-semibold">
                {formatNumber(marketplace.signals.forks)}
              </span>
              <span className="text-[var(--foreground-muted)]">forks</span>
            </div>
            {marketplace.signals.pushed_at && (
              <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Updated {formatDate(marketplace.signals.pushed_at)}</span>
              </div>
            )}
          </div>

          {/* Category Pills */}
          {marketplace.categories && marketplace.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {marketplace.categories.map((category) => (
                <CategoryPill key={category} category={category} size="md" />
              ))}
            </div>
          )}

          {/* Keyword Pills */}
          {marketplace.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {marketplace.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-1 text-xs rounded-full bg-[var(--background-secondary)] text-[var(--foreground-secondary)]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Plugins List with Inline Details */}
          <section>
            <h2 className="section-title mb-4">
              Plugins ({marketplace.plugins.length})
            </h2>
            <div className="space-y-4">
              {marketplace.plugins.map((plugin, index) => (
                <PluginSection
                  key={plugin.name}
                  plugin={plugin}
                  defaultExpanded={marketplace.plugins.length === 1}
                />
              ))}
            </div>
          </section>

          {/* File Tree */}
          <section>
            <h2 className="section-title mb-4">Files</h2>
            <FileTree entries={marketplace.file_tree} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Command */}
          <section>
            <h2 className="section-title mb-4">Install Marketplace</h2>
            <CopyableCommand command={installCommand} />
          </section>

          {/* GitHub Link */}
          <section>
            <h2 className="section-title mb-4">Links</h2>
            <div className="space-y-2">
              <a
                href={marketplace.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                View on GitHub
              </a>
              {marketplace.homepage && (
                <a
                  href={marketplace.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Homepage
                </a>
              )}
            </div>
          </section>

          {/* More from Author */}
          <section>
            <h2 className="section-title mb-4">
              More from {author.display_name}
            </h2>
            <Link
              href={`/${author.id}`}
              className="flex items-center gap-3 p-3 card"
            >
              <Image
                src={author.avatar_url}
                alt={author.display_name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <span className="font-medium">{author.display_name}</span>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {author.stats.total_plugins} plugins across{" "}
                  {author.stats.total_marketplaces} marketplace
                  {author.stats.total_marketplaces !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
