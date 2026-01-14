"use client";

import { useEffect, useState } from "react";
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
import { PluginCard, LoadingState, ErrorState } from "@/components";
import type { OwnerDetail, FlatPlugin } from "@/lib/types";
import { flattenPlugins, formatNumber } from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";

export default function OwnerPage() {
  const params = useParams();
  const rawOwnerId = params.id as string;
  const ownerId = validateUrlParam(rawOwnerId);

  const [ownerData, setOwnerData] = useState<OwnerDetail | null>(null);
  const [plugins, setPlugins] = useState<FlatPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOwner() {
      if (!ownerId) {
        setError("Invalid owner ID");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/data/owners/${ownerId}.json`, { signal: controller.signal });
        if (!res.ok) throw new Error("Owner not found");
        const data: OwnerDetail = await res.json();
        setOwnerData(data);
        setPlugins(flattenPlugins(data));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setError("Failed to load owner data");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOwner();
    return () => controller.abort();
  }, [ownerId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !ownerData) {
    return (
      <ErrorState
        title="Owner Not Found"
        message={error || "This owner does not exist."}
        action={{ label: "Back to Home", href: "/" }}
      />
    );
  }

  const { owner, repos } = ownerData;

  return (
    <div className="container py-8">
      {/* Owner Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <Image
          src={owner.avatar_url}
          alt={owner.display_name}
          width={120}
          height={120}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{owner.display_name}</h1>
            <a
              href={owner.url}
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
            {owner.type === "Organization" ? (
              <Building2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <User className="w-4 h-4" aria-hidden="true" />
            )}
            <span>@{owner.id}</span>
            <span>&middot;</span>
            <span>{owner.type}</span>
          </div>

          {owner.bio && (
            <p className="text-[var(--foreground-secondary)] mb-4 max-w-2xl">
              {owner.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(owner.stats.total_stars)}
              </span>
              <span className="text-[var(--foreground-muted)]">total stars</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
              <span className="font-semibold">
                {formatNumber(owner.stats.total_forks)}
              </span>
              <span className="text-[var(--foreground-muted)]">forks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4" aria-hidden="true" />
              <span className="font-semibold">{owner.stats.total_repos}</span>
              <span className="text-[var(--foreground-muted)]">
                repo{owner.stats.total_repos !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{owner.stats.total_plugins}</span>
              <span className="text-[var(--foreground-muted)]">
                plugin{owner.stats.total_plugins !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Repositories */}
      <section className="mb-12">
        <h2 className="section-title mb-6">Repositories</h2>
        <div className="space-y-4">
          {repos.map((repo) => (
            <div key={repo.full_name} className="card p-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-lg hover:text-[var(--accent)] transition-colors"
                    >
                      {repo.full_name}
                    </a>
                    <ExternalLink className="w-4 h-4 text-[var(--foreground-muted)]" aria-hidden="true" />
                  </div>
                  <p className="text-[var(--foreground-secondary)] text-sm mb-3">
                    {repo.description || "No description"}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-muted)]">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" aria-hidden="true" />
                      {formatNumber(repo.signals.stars)}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" aria-hidden="true" />
                      {formatNumber(repo.signals.forks)}
                    </span>
                    <span>{repo.marketplace?.plugins?.length || 0} plugins</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plugins */}
      <section>
        <h2 className="section-title mb-6">
          Plugins ({plugins.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plugins.map((plugin) => (
            <PluginCard
              key={`${plugin.owner_id}-${plugin.name}`}
              plugin={plugin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
