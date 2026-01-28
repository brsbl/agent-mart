"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Github, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle theme"
      >
        <Monitor size={14} />
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
    if (theme === "light") return <Sun size={14} />;
    if (theme === "dark") return <Moon size={14} />;
    return <Monitor size={14} />;
  };

  const getLabel = () => {
    if (theme === "light") return "Light mode (click to switch to dark)";
    if (theme === "dark") return "Dark mode (click to switch to system)";
    return "System theme (click to switch to light)";
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
}

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-end gap-2">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <pre className="text-gray-900 dark:text-gray-100 leading-none font-mono text-[7px] tracking-tight">
{`  █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███╗   ███╗ █████╗ ██████╗ ████████╗
 ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
 ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██╔████╔██║███████║██████╔╝   ██║
 ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║╚██╔╝██║██╔══██║██╔══██╗   ██║
 ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`}
            </pre>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <a
              href="https://github.com/brsbl/agent-mart"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="View on GitHub"
            >
              <Github size={14} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
