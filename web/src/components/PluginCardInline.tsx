import { InstallCommand } from "./InstallCommand";
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
    install_command: string;
  };
}

export function PluginCardInline({ plugin }: PluginCardInlineProps) {
  const categories = plugin.categories ?? [];
  const displayCategories = categories.slice(0, MAX_CATEGORIES);
  const remainingCount = categories.length - MAX_CATEGORIES;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all">
      {/* Header: Name + Version */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {plugin.name}
        </h3>
        {plugin.version && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
            v{plugin.version}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {plugin.description || "No description"}
      </p>

      {/* Category Badges */}
      {displayCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {displayCategories.map((cat) => (
            <span
              key={cat}
              className={`badge ${getCategoryBadgeClass(cat)}`}
            >
              {getCategoryDisplayName(cat)}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
              +{remainingCount}
            </span>
          )}
        </div>
      )}

      {/* Install Command */}
      <InstallCommand command={plugin.install_command} label="Install plugin" />
    </div>
  );
}
