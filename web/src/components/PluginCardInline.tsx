import { InstallCommand } from "./InstallCommand";

interface PluginCardInlineProps {
  plugin: {
    name: string;
    description: string | null;
    version?: string;
    keywords?: string[];
    install_command: string;
  };
}

const MAX_KEYWORDS = 4;

export function PluginCardInline({ plugin }: PluginCardInlineProps) {
  const displayedKeywords = plugin.keywords?.slice(0, MAX_KEYWORDS) ?? [];
  const remainingCount = (plugin.keywords?.length ?? 0) - MAX_KEYWORDS;

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      {/* Header: Name + Version */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{plugin.name}</h3>
        {plugin.version && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded">
            v{plugin.version}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 truncate mb-3">
        {plugin.description || "No description"}
      </p>

      {/* Keywords */}
      {displayedKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {displayedKeywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full"
            >
              {keyword}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-[10px] text-gray-400">
              +{remainingCount} more
            </span>
          )}
        </div>
      )}

      {/* Install Command */}
      <InstallCommand command={plugin.install_command} label="Install plugin" />
    </div>
  );
}
