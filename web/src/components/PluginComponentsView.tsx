"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Bot, Terminal, Lightbulb, Webhook } from "lucide-react";
import type { Marketplace, PluginWithComponents, ComponentType } from "@/lib/types";
import { organizePluginComponents } from "@/lib/data";

interface PluginComponentsViewProps {
  marketplace: Marketplace;
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
}

const COMPONENT_CONFIG: Record<ComponentType, { label: string; icon: React.ReactNode }> = {
  agent: { label: "Agents", icon: <Bot size={14} /> },
  command: { label: "Commands", icon: <Terminal size={14} /> },
  skill: { label: "Skills", icon: <Lightbulb size={14} /> },
  hook: { label: "Hooks", icon: <Webhook size={14} /> },
};

interface ComponentListProps {
  type: ComponentType;
  components: { name: string; path: string }[];
  selectedFile: string;
  onSelectFile: (path: string) => void;
}

function ComponentList({ type, components, selectedFile, onSelectFile }: ComponentListProps) {
  if (components.length === 0) return null;

  const config = COMPONENT_CONFIG[type];

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 px-2">
        {config.icon}
        <span>{config.label}</span>
      </div>
      <ul className="space-y-0.5">
        {components.map((component) => (
          <li key={component.path}>
            <button
              type="button"
              onClick={() => onSelectFile(component.path)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm font-mono transition-colors cursor-pointer ${
                selectedFile === component.path
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {component.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PluginSectionProps {
  plugin: PluginWithComponents;
  selectedFile: string;
  onSelectFile: (path: string) => void;
  defaultExpanded?: boolean;
}

function PluginSection({ plugin, selectedFile, onSelectFile, defaultExpanded = true }: PluginSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasComponents =
    plugin.components.agents.length > 0 ||
    plugin.components.commands.length > 0 ||
    plugin.components.skills.length > 0 ||
    plugin.components.hooks.length > 0;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{plugin.name}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {hasComponents ? (
            <>
              <ComponentList
                type="agent"
                components={plugin.components.agents}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="command"
                components={plugin.components.commands}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="skill"
                components={plugin.components.skills}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="hook"
                components={plugin.components.hooks}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No browseable components</p>
          )}
        </div>
      )}
    </div>
  );
}

export function PluginComponentsView({ marketplace, selectedFile = "", onSelectFile = () => {} }: PluginComponentsViewProps) {
  const pluginsWithComponents = useMemo(
    () => organizePluginComponents(marketplace),
    [marketplace]
  );

  // Show all plugins (even empty ones)
  const pluginsToShow = pluginsWithComponents;

  const isSinglePlugin = pluginsToShow.length === 1;

  if (pluginsToShow.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No plugin components found</p>
      </div>
    );
  }

  // Single plugin layout - no collapsible header
  if (isSinglePlugin) {
    const plugin = pluginsToShow[0];
    const hasComponents =
      plugin.components.agents.length > 0 ||
      plugin.components.commands.length > 0 ||
      plugin.components.skills.length > 0 ||
      plugin.components.hooks.length > 0;

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{plugin.name}</h2>
        </div>
        <div className="p-4">
          {hasComponents ? (
            <>
              <ComponentList
                type="agent"
                components={plugin.components.agents}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="command"
                components={plugin.components.commands}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="skill"
                components={plugin.components.skills}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
              <ComponentList
                type="hook"
                components={plugin.components.hooks}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
              />
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No browseable components</p>
          )}
        </div>
      </div>
    );
  }

  // Multi-plugin layout - collapsible sections
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Plugins</h2>
      </div>
      <div>
        {pluginsToShow.map((plugin) => (
          <PluginSection
            key={plugin.name}
            plugin={plugin}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
