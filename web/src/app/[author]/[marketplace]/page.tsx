"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  GitFork,
  ExternalLink,
  Clock,
  Copy,
  Check,
  Github,
} from "lucide-react";
import {
  CopyableCommand,
  PluginComponentsView,
  LoadingState,
  ErrorState,
  MarketplaceCard,
} from "@/components";
import { useFetch, useStarredRepos, useCopyToClipboard } from "@/hooks";
import type { AuthorDetail, Marketplace } from "@/lib/types";
import { formatNumber } from "@/lib/data";
import { validateUrlParam } from "@/lib/validation";
import { DATA_URLS } from "@/lib/constants";

// Format relative time (e.g., "2d ago", "3mo ago")
function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

// Get file content for selected file
function getFileContent(fileName: string, marketplace: Marketplace): string {
  // Look up file content from the files map
  const content = marketplace.files?.[fileName];
  if (content) {
    return content;
  }
  return `File content not available for: ${fileName}`;
}

export default function MarketplaceDetailPage() {
  const params = useParams();
  const authorId = validateUrlParam(params.author);
  const marketplaceName = validateUrlParam(params.marketplace);
  const { isStarred, toggleStar } = useStarredRepos();

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

  // Get other marketplaces from the same author
  const otherMarketplaces = useMemo(() => {
    if (!authorData || !marketplaceName) {
      return [];
    }
    return authorData.marketplaces
      .filter((m) => m.name !== marketplaceName)
      .slice(0, 3);
  }, [authorData, marketplaceName]);

  // Generate install command for the entire marketplace
  const installCommand = useMemo(() => {
    if (!marketplace) {
      return "";
    }

    return `/plugin marketplace add ${marketplace.repo_full_name}`;
  }, [marketplace]);

  const repoId = marketplace?.repo_full_name || "";
  const starred = isStarred(repoId);
  const [isForked, setIsForked] = useState(false);

  // Default to first component file (agent/command/skill/hook) or fallback to first blob
  const defaultFile = useMemo(() => {
    if (!marketplace?.files) return "";
    const filePaths = Object.keys(marketplace.files);

    // Prefer component files in order: agents, commands, skills, hooks
    const componentFile = filePaths.find(
      (p) =>
        (p.includes('/agents/') && p.endsWith('.md')) ||
        (p.includes('/commands/') && p.endsWith('.md')) ||
        (p.includes('/skills/') && p.endsWith('.md')) ||
        p.endsWith('/SKILL.md') ||
        p === 'SKILL.md' ||
        p.includes('/hooks/')
    );
    if (componentFile) return componentFile;

    // Fallback to first blob in file tree
    const firstBlob = marketplace.file_tree?.find(e => e.type === "blob");
    return firstBlob?.path || "";
  }, [marketplace?.files, marketplace?.file_tree]);

  const [selectedFile, setSelectedFile] = useState<string>("");

  // Set selected file to default when marketplace loads
  useEffect(() => {
    if (defaultFile && !selectedFile) {
      setSelectedFile(defaultFile);
    }
  }, [defaultFile, selectedFile]);

  const { copied, copy } = useCopyToClipboard();

  const handleStarClick = () => {
    if (repoId) {
      toggleStar(repoId);
    }
  };

  const handleForkClick = () => {
    setIsForked(!isForked);
  };

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
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Header Card */}
          <div className="border border-gray-200 rounded-xl bg-white p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-base font-semibold text-gray-900 mb-2">
                  {marketplace.name}
                </h1>
                <div className="flex items-center gap-2 mb-4">
                  <Image
                    src={author.avatar_url}
                    alt={author.display_name}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full border border-gray-300"
                  />
                  <p className="text-xs text-gray-600 font-mono">@{author.id}</p>
                </div>
                <p className="text-xs text-gray-700">
                  {marketplace.description || "No description"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleStarClick}
                className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={starred ? "Unstar this repository" : "Star this repository"}
              >
                <Star
                  size={12}
                  className={starred ? "text-yellow-500" : ""}
                  fill={starred ? "currentColor" : "none"}
                />
                {formatNumber(marketplace.signals.stars)}
              </button>
              <button
                type="button"
                onClick={handleForkClick}
                className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                aria-label={isForked ? "Unfork this repository" : "Fork this repository"}
              >
                <GitFork
                  size={12}
                  strokeWidth={isForked ? 1 : 2}
                  className={isForked ? "text-blue-500" : ""}
                  fill={isForked ? "currentColor" : "none"}
                />
                {formatNumber(marketplace.signals.forks)}
              </button>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatRelativeTime(marketplace.signals.pushed_at)}
              </span>
            </div>
          </div>

          {/* Plugin Components */}
          <PluginComponentsView
            marketplace={marketplace}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />

          {/* File Viewer - shows selected file, defaults to README.md */}
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 font-mono">{selectedFile}</h2>
            </div>
            <div className="p-6">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                {getFileContent(selectedFile, marketplace)}
              </pre>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">`Install`</h2>

            {/* Marketplace Install */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1.5">Add marketplace:</div>
              <div className="bg-gray-100 rounded-lg p-2.5 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-gray-800 text-xs font-mono break-all">
                    {installCommand}
                  </code>
                  <button
                    onClick={() => copy(installCommand)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check size={12} className="text-green-600" />
                    ) : (
                      <Copy size={12} className="text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Plugin Installs */}
            {marketplace.plugins.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 mb-1.5">Install plugins:</div>
                {marketplace.plugins.map((plugin) => {
                  const pluginCommand = `/plugin install ${plugin.name}@${marketplace.repo_full_name.replace("/", "-")}`;
                  return (
                    <div key={plugin.name}>
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        {plugin.name}
                      </div>
                      <div className="bg-gray-100 rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-gray-800 text-xs font-mono break-all">
                            {pluginCommand}
                          </code>
                          <button
                            onClick={() => copy(pluginCommand)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 cursor-pointer"
                            title="Copy to clipboard"
                          >
                            <Copy size={12} className="text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GitHub Link */}
          <a
            href={marketplace.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Github size={16} />
            <span>View on GitHub</span>
            <ExternalLink size={14} />
          </a>

          {/* More from Author */}
          {otherMarketplaces.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-sm text-gray-600 mb-3">
                More from this author
              </h2>
              <div className="space-y-3">
                {otherMarketplaces.slice(0, 2).map((m) => (
                  <Link
                    key={m.name}
                    href={`/${author.id}/${m.name}`}
                    className="block"
                  >
                    <MarketplaceCard
                      marketplace={m}
                      author_id={author.id}
                      author_display_name={author.display_name}
                      author_avatar_url={author.avatar_url}
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
