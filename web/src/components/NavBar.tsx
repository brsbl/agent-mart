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
    <pre className="text-ascii-text leading-none font-mono text-[4px] xl:text-[5px] tracking-tight">
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
  const showSearch = pathname === "/browse";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/30 backdrop-blur-md">
      <div className="relative py-3">
        {/* Mobile layout (< lg): stacked rows */}
        <div className="lg:hidden px-4 sm:px-6">
          {/* Top row: Logo and GitHub */}
          <div className="flex items-center justify-between">
            <Link href="/browse" className="hover:opacity-80 transition-opacity">
              <TextLogo />
            </Link>
            <GitHubLink />
          </div>

          {/* Search row (browse page only) */}
          {showSearch && (
            <div className="mt-3">
              <SearchFilterControls />
            </div>
          )}
        </div>

        {/* Desktop layout (lg+): logo/GitHub at edges, controls at grid width */}
        <div className="hidden lg:block">
          {/* Logo and GitHub at viewport edges */}
          <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
            <Link href="/browse" className="pointer-events-auto shrink-0 hover:opacity-80 transition-opacity">
              <AsciiLogo />
            </Link>
            <div className="pointer-events-auto shrink-0">
              <GitHubLink />
            </div>
          </div>

          {/* Search/Filter/Sort - centered container matching card grid width */}
          {showSearch ? (
            <div
              className="max-w-6xl mx-auto"
              style={{
                paddingLeft: 'max(1.5rem, 285px - max(0px, (100vw - 72rem) / 2))',
                paddingRight: 'max(1.5rem, 163px - max(0px, (100vw - 72rem) / 2))',
              }}
            >
              <SearchFilterControls />
            </div>
          ) : (
            <div className="h-[30px]" />
          )}
        </div>
      </div>
    </header>
  );
}
