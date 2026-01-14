"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  GitFork,
  ExternalLink,
  Terminal,
  Sparkles,
  Calendar,
} from "lucide-react";
import { CopyableCommand, FileTree } from "@/components";
import type { OwnerDetail, Plugin, Repo } from "@/lib/types";
import { formatNumber, formatDate, getCategoryBadgeClass } from "@/lib/data";

export default function PluginPage() {
  const params = useParams();
  const ownerId = params.owner as string;
  const pluginName = params.plugin as string;

  const [ownerData, setOwnerData] = useState<OwnerDetail | null>(null);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlugin() {
      try {
        const res = await fetch(`/data/owners/${ownerId}.json`);
        if (!res.ok) throw new Error("Owner not found");
        const data: OwnerDetail = await res.json();
        setOwnerData(data);

        // Find the plugin
        for (const r of data.repos) {
          const plugins = r.marketplace?.plugins || [];
          const p = plugins.find((p) => p.name === pluginName);
          if (p) {
            setPlugin(p);
            setRepo(r);
            break;
          }
        }
      } catch {
        setError("Failed to load plugin data");
      } finally {
        setLoading(false);
      }
    }

    if (ownerId && pluginName) {
      loadPlugin();
    }
  }, [ownerId, pluginName]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-[var(--foreground-muted)]">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (error || !ownerData || !plugin || !repo) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Plugin Not Found</h1>
          <p className="text-[var(--foreground-muted)]">
            {error || "This plugin does not exist."}
          </p>
          <Link href="/" className="btn btn-primary mt-4 inline-flex">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { owner } = ownerData;

  return (
    <div className="container py-8">
      {/* Plugin Header */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <Image
          src={owner.avatar_url}
          alt={owner.display_name}
          width={80}
          height={80}
          className="rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{plugin.name}</h1>
            <span className={`badge ${getCategoryBadgeClass(plugin.category)}`}>
              {plugin.category}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[var(--foreground-muted)] mb-4">
            <span>by</span>
            <Link
              href={`/owner/${owner.id}`}
              className="text-[var(--accent)] hover:underline"
            >
              @{owner.id}
            </Link>
            <span>&middot;</span>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
            >
              {repo.full_name}
              <ExternalLink className="w-3 h-3" />
            </a>
            {plugin.version && (
              <>
                <span>&middot;</span>
                <span>v{plugin.version}</span>
              </>
            )}
          </div>

          <p className="text-[var(--foreground-secondary)] mb-4 max-w-3xl">
            {plugin.description || "No description"}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-semibold">
                {formatNumber(plugin.signals.stars)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-[var(--foreground-muted)]" />
              <span className="font-semibold">
                {formatNumber(plugin.signals.forks)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
              <Calendar className="w-4 h-4" />
              <span>Updated {formatDate(plugin.signals.pushed_at)}</span>
            </div>
          </div>

          {/* Author */}
          {plugin.author && (
            <p className="text-sm text-[var(--foreground-muted)] mt-2">
              Author: {plugin.author.name}
              {plugin.author.email && ` <${plugin.author.email}>`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Commands */}
          {plugin.commands.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[var(--accent)]" />
                Commands ({plugin.commands.length})
              </h2>
              <div className="space-y-3">
                {plugin.commands.map((command) => (
                  <div key={command.name} className="card p-4">
                    <code className="font-mono font-semibold text-[var(--accent)]">
                      {command.name}
                    </code>
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                      {command.description || "No description"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {plugin.skills.length > 0 && (
            <section>
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--accent)]" />
                Skills ({plugin.skills.length})
              </h2>
              <div className="space-y-3">
                {plugin.skills.map((skill) => (
                  <div key={skill.name} className="card p-4">
                    <span className="font-semibold">{skill.name}</span>
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                      {skill.description || "No description"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* File Tree */}
          <section>
            <h2 className="section-title mb-4">Files</h2>
            <FileTree
              entries={repo.file_tree}
              basePath={plugin.source.replace(/^\.\//, "")}
            />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install */}
          <section>
            <h2 className="section-title mb-4">Install</h2>
            <CopyableCommand commands={plugin.install_commands} />
          </section>

          {/* Links */}
          <section>
            <h2 className="section-title mb-4">Links</h2>
            <div className="space-y-2">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </a>
              {repo.homepage && (
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Homepage
                </a>
              )}
            </div>
          </section>

          {/* More from this owner */}
          <section>
            <h2 className="section-title mb-4">More from {owner.display_name}</h2>
            <Link
              href={`/owner/${owner.id}`}
              className="flex items-center gap-3 p-3 card"
            >
              <Image
                src={owner.avatar_url}
                alt={owner.display_name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <span className="font-medium">{owner.display_name}</span>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {owner.stats.total_plugins} plugins
                </p>
              </div>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
