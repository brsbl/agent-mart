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
        className="p-1.5 text-foreground-muted hover:text-foreground-secondary transition-colors rounded hover:bg-background-secondary"
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
      className="p-1.5 text-foreground-muted hover:text-foreground-secondary transition-colors rounded hover:bg-background-secondary"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/30 backdrop-blur-md py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-foreground-muted">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-foreground-secondary transition-colors"
            >
              Home
            </Link>
            <a
              href="https://github.com/brsbl/agent-mart"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground-secondary transition-colors"
            >
              GitHub
            </a>
            <ThemeToggle />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-foreground-muted">
            <span>&copy; Agent Mart 2026. All rights reserved.</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>Not affiliated with Anthropic.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
