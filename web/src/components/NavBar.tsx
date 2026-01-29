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
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-md"
      aria-label="View source on GitHub"
    >
      <span>View Source</span>
      <Github size={16} />
    </a>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[#F5F5F1]/30 dark:bg-[#1A1A1A]/30 backdrop-blur-md">
      <div className="relative px-6 py-3">
        {/* Logo - far left */}
        <Link href="/" className="absolute left-6 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity">
          <pre className="text-foreground leading-none font-mono text-[5px] tracking-tight">
{`  █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███╗   ███╗ █████╗ ██████╗ ████████╗
 ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
 ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██╔████╔██║███████║██████╔╝   ██║
 ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║╚██╔╝██║██╔══██║██╔══██╗   ██║
 ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`}
          </pre>
        </Link>

        {/* Right icons - far right */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <GitHubLink />
        </div>

        {/* Search/Filter/Sort - centered, grid-aligned (home page only) */}
        {isHomePage && (
          <div className="max-w-6xl mx-auto px-6">
            <SearchFilterControls />
          </div>
        )}

        {/* Spacer for non-home pages to maintain height */}
        {!isHomePage && <div className="h-[38px]" />}
      </div>
    </header>
  );
}
