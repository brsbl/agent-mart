"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  GitFork,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { CopyableCommand, FileTree, LoadingState, ErrorState } from "@/components";
import { useFetch } from "@/hooks";
import type { AuthorDetail, Plugin, Marketplace } from "@/lib/types";
import { formatNumber, formatDate, getCategoryBadgeClass, normalizeCategory, getCategoryDisplayName } from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

export default function PluginPage() {
  const params = useParams();
  const ownerId = validateUrlParam(params.owner);
  const pluginName = validateUrlParam(params.plugin);

  // Build URL conditionally - null if params are invalid
  const url = ownerId && pluginName ? DATA_URLS.AUTHOR(ownerId) : null;

  const { data: authorData, loading, error } = useFetch<AuthorDetail>(
    url,
    "Failed to load plugin data"
  );

  // Find the plugin and marketplace from author data
  const pluginData = useMemo(() => {
    if (!authorData || !pluginName) {
      return null;
    }

    for (const m of authorData.marketplaces) {
      const plugins = m.plugins || [];
      const foundPlugin = plugins.find((p) => p.name === pluginName);
      if (foundPlugin) {
        return { plugin: foundPlugin, marketplace: m };
      }
    }

    return null;
  }, [authorData, pluginName]);
  const plugin = pluginData?.plugin ?? null;
  const marketplace = pluginData?.marketplace ?? null;

  if (loading) {
    return <LoadingState />;
  }

  // Handle invalid URL params
  if (!ownerId || !pluginName) {
    return (
      <ErrorState
        title="Plugin Not Found"
        message="Invalid URL parameters"
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  if (error || !authorData || !plugin || !marketplace) {
    return (
      <ErrorState
        title="Plugin Not Found"
        message={error || "This plugin does not exist."}
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  const { author } = authorData;
  const category = plugin.categories[0] ?? 'orchestration';

  return (
    <div className="container py-8">
      {/* Plugin Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <Image
          src={author.avatar_url}
          alt={author.display_name}
          width={80}
          height={80}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{plugin.name}</h1>
            <span className={`badge ${getCategoryBadgeClass(normalizeCategory(category))}`}>
              {getCategoryDisplayName(normalizeCategory(category))}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-4">
            <span>by</span>
            <Link
              href={`/owner/${author.id}`}
              className="text-[var(--accent)] hover:underline"
            >
              @{author.id}
            </Link>
            <span>&middot;</span>
            <a
              href={marketplace.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
            >
              {marketplace.repo_full_name}
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>

          <p className="text-[var(--foreground-secondary)] mb-4 max-w-3xl">
            {plugin.description || "No description"}
          </p>

          {/* Stats - using marketplace signals */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(marketplace.signals.stars)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(marketplace.signals.forks)}
              </span>
            </div>
            {marketplace.signals.pushed_at && (
              <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>Updated {formatDate(marketplace.signals.pushed_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* File Tree */}
          <section>
            <h2 className="section-title mb-4">Files</h2>
            <FileTree
              entries={marketplace.file_tree}
              basePath={typeof plugin.source === 'string' ? plugin.source.replace(/^\.\//, "") : ""}
            />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install */}
          <section>
            <h2 className="section-title mb-4">Install</h2>
            <CopyableCommand command={plugin.install_commands} />
          </section>

          {/* Links */}
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

          {/* More from this owner */}
          <section>
            <h2 className="section-title mb-4">More from {author.display_name}</h2>
            <Link
              href={`/owner/${author.id}`}
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
                  {author.stats.total_plugins} plugins
                </p>
              </div>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
