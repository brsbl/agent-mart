"use client";

import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface InstallCommandProps {
  command: string;
  label?: string;
}

export function InstallCommand({ command, label }: InstallCommandProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="bg-terminal-bg dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Terminal header */}
      {label && (
        <div className="px-3 py-1 bg-card/10 border-b border-white/15 dark:bg-gray-900">
          <span className="text-[10px] text-terminal-text font-mono opacity-60 dark:opacity-80">{label}</span>
        </div>
      )}
      {/* Command line */}
      <div className="px-3 py-1.5 flex items-center justify-between gap-3">
        <code className="text-terminal-text text-xs font-mono break-all">
          <span className="opacity-50">$</span> {command}
        </code>
        <button
          type="button"
          onClick={() => copy(command)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-terminal-text bg-white/10 hover:bg-white/20 rounded transition-colors flex-shrink-0 cursor-pointer"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
