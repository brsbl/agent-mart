"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Github } from "lucide-react";
import { SearchFilterControls } from "./SearchFilterControls";

function GitHubLink() {
  return (
    <a
      href="https://github.com/brsbl/agent-mart"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2 py-1.5 text-sm bg-neutral-700 text-white hover:bg-neutral-600 transition-colors rounded-md border border-neutral-600"
      aria-label="View source on GitHub"
    >
      <span className="hidden sm:inline">View Source</span>
      <Github size={16} />
    </a>
  );
}

function AsciiLogo() {
  return (
    <pre className="text-foreground leading-none font-mono text-[4px] xl:text-[5px] tracking-tight">
{`  █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███╗   ███╗ █████╗ ██████╗ ████████╗
 ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
 ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██╔████╔██║███████║██████╔╝   ██║
 ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║╚██╔╝██║██╔══██║██╔══██╗   ██║
 ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`}
    </pre>
  );
}

function TextLogo() {
  return (
    <span className="text-foreground font-mono text-sm font-bold tracking-tight">
      AGENT MART
    </span>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/30 backdrop-blur-md">
      <div className="relative px-4 sm:px-6 py-3">
        {/* Mobile layout (< lg): stacked rows */}
        <div className="lg:hidden">
          {/* Top row: Logo and GitHub */}
          <div className="flex items-center justify-between">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <TextLogo />
            </Link>
            <GitHubLink />
          </div>

          {/* Search row (home page only) */}
          {isHomePage && (
            <div className="mt-3">
              <SearchFilterControls />
            </div>
          )}
        </div>

        {/* Desktop layout (lg+): single flex row */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Logo - shrinks at smaller widths */}
          <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
            <AsciiLogo />
          </Link>

          {/* Search/Filter/Sort - fills remaining space */}
          {isHomePage ? (
            <div className="flex-1 min-w-0">
              <SearchFilterControls />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* GitHub - fixed size on right */}
          <div className="shrink-0">
            <GitHubLink />
          </div>
        </div>
      </div>
    </header>
  );
}
