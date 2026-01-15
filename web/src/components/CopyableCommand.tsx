"use client";

import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface CopyableCommandProps {
  command: string | string[];
  className?: string;
}

export function CopyableCommand({
  command,
  className = "",
}: CopyableCommandProps) {
  const { copied, copy } = useCopyToClipboard();

  const commands = Array.isArray(command) ? command : [command];
  const textToCopy = commands.join("\n");
  const isMultiLine = commands.length > 1;

  return (
    <div className={`terminal group relative ${className}`}>
      <div
        className={`flex ${isMultiLine ? "items-start" : "items-center"} justify-between gap-4`}
      >
        <div className="flex-1 overflow-x-auto">
          {isMultiLine ? (
            commands.map((cmd, i) => (
              <div key={`cmd-${i}-${cmd.slice(0, 20)}`} className="whitespace-nowrap">
                {cmd}
              </div>
            ))
          ) : (
            <code className="whitespace-nowrap">{commands[0]}</code>
          )}
        </div>
        <button
          onClick={() => copy(textToCopy)}
          className="flex-shrink-0 p-1 rounded opacity-50 group-hover:opacity-100 hover:bg-white/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--terminal-bg)] transition-opacity"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[var(--success)]" aria-hidden="true" />
          ) : (
            <Copy className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {copied && (
        <div className="absolute -top-8 right-0 px-2 py-1 text-xs bg-[var(--success)] text-white rounded shadow-md">
          Copied!
        </div>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Command copied to clipboard" : ""}
      </span>
    </div>
  );
}