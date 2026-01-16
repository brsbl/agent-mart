"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Star,
  GitFork,
  ExternalLink,
  Package,
  Building2,
  User,
} from "lucide-react";
import { MarketplaceCard, LoadingState, ErrorState } from "@/components";
import { useFetch } from "@/hooks";
import type { AuthorDetail } from "@/lib/types";
import { formatNumber } from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

export default function AuthorPage() {
  const params = useParams();
  const authorId = validateUrlParam(params.author);

  // Build URL conditionally - null if authorId is invalid
  const url = authorId ? DATA_URLS.AUTHOR(authorId) : null;

  const { data: authorData, loading, error } = useFetch<AuthorDetail>(
    url,
    "Failed to load author data"
  );

  if (loading) {
    return <LoadingState />;
  }

  // Handle invalid authorId case
  if (!authorId) {
    return (
      <ErrorState
        title="Author Not Found"
        message="Invalid author ID"
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  if (error || !authorData) {
    return (
      <ErrorState
        title="Author Not Found"
        message={error || "This author does not exist."}
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  const { author, marketplaces } = authorData;

  return (
    <div className="container py-8">
      {/* Author Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <Image
          src={author.avatar_url}
          alt={author.display_name}
          width={120}
          height={120}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{author.display_name}</h1>
            <a
              href={author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
              title="View on GitHub"
              aria-label="View on GitHub"
            >
              <ExternalLink className="w-5 h-5 text-[var(--foreground-muted)]" aria-hidden="true" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-4">
            {author.type === "Organization" ? (
              <Building2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <User className="w-4 h-4" aria-hidden="true" />
            )}
            <span>@{author.id}</span>
            <span>&middot;</span>
            <span>{author.type}</span>
          </div>

          {author.bio && (
            <p className="text-[var(--foreground-secondary)] mb-4 max-w-2xl">
              {author.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(author.stats.total_stars)}
              </span>
              <span className="text-[var(--foreground-muted)]">total stars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(author.stats.total_forks)}
              </span>
              <span className="text-[var(--foreground-muted)]">forks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold">{author.stats.total_marketplaces}</span>
              <span className="text-[var(--foreground-muted)]">
                marketplace{author.stats.total_marketplaces !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{author.stats.total_plugins}</span>
              <span className="text-[var(--foreground-muted)]">
                plugin{author.stats.total_plugins !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Marketplaces Grid */}
      <section>
        <h2 className="section-title mb-6">
          Marketplaces ({marketplaces.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {marketplaces.map((marketplace) => (
            <MarketplaceCard
              key={marketplace.name}
              marketplace={marketplace}
              author_id={author.id}
              author_display_name={author.display_name}
              author_avatar_url={author.avatar_url}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
