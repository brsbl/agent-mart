"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableCommandProps {
  commands: string[];
  className?: string;
}

export function CopyableCommand({
  commands,
  className = "",
}: CopyableCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = commands.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`terminal group relative cursor-pointer ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCopy();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 overflow-x-auto">
          {commands.map((cmd, i) => (
            <div key={i} className="whitespace-nowrap">
              {cmd}
            </div>
          ))}
        </div>
        <button
          className="flex-shrink-0 p-1 rounded opacity-50 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[var(--success)]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      {copied && (
        <div className="absolute -top-8 right-0 px-2 py-1 text-xs bg-[var(--success)] text-white rounded shadow-md">
          Copied!
        </div>
      )}
    </div>
  );
}

// Single command variant
interface CopyableCommandSingleProps {
  command: string;
  className?: string;
  compact?: boolean;
}

export function CopyableCommandSingle({
  command,
  className = "",
  compact = false,
}: CopyableCommandSingleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-[var(--terminal-bg)] text-[var(--terminal-text)] rounded hover:bg-[var(--terminal-bg)]/80 transition-colors ${className}`}
        title={copied ? "Copied!" : "Click to copy"}
      >
        {copied ? (
          <Check className="w-3 h-3 text-[var(--success)]" />
        ) : (
          <Copy className="w-3 h-3 opacity-50" />
        )}
        <span className="truncate max-w-[200px]">{command}</span>
      </button>
    );
  }

  return (
    <div
      className={`terminal group relative cursor-pointer ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCopy();
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <code className="flex-1 overflow-x-auto whitespace-nowrap">
          {command}
        </code>
        <button
          className="flex-shrink-0 p-1 rounded opacity-50 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[var(--success)]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      {copied && (
        <div className="absolute -top-8 right-0 px-2 py-1 text-xs bg-[var(--success)] text-white rounded shadow-md">
          Copied!
        </div>
      )}
    </div>
  );
}
