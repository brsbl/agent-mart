"use client";

import Link from "next/link";
import { Github } from "lucide-react";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <pre className="text-gray-900 leading-none font-mono text-[7px] tracking-tight">
{`  █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ███╗   ███╗ █████╗ ██████╗ ████████╗
 ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
 ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██╔████╔██║███████║██████╔╝   ██║
 ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║╚██╔╝██║██╔══██║██╔══██╗   ██║
 ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║ ╚═╝ ██║██║  ██║██║  ██║   ██║
 ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`}
            </pre>
          </Link>
          <a
            href="https://github.com/anthropics/agent-mart"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="View on GitHub"
          >
            <Github size={20} />
          </a>
        </div>
      </div>
    </header>
  );
}
