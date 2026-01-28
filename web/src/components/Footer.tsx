"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

// Use useSyncExternalStore for hydration-safe mounting detection
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <button
        type="button"
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle theme"
      >
        <Monitor size={16} />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  const getIcon = () => {
    if (theme === "light") return <Sun size={16} />;
    if (theme === "dark") return <Moon size={16} />;
    return <Monitor size={16} />;
  };

  const getLabel = () => {
    if (theme === "light") return "Light mode (click for dark)";
    if (theme === "dark") return "Dark mode (click for system)";
    return "System theme (click for light)";
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0a] py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Home
            </Link>
            <a
              href="https://github.com/brsbl/agent-mart"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span>&copy; Agent Mart 2026. All rights reserved.</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>Not affiliated with Anthropic.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
