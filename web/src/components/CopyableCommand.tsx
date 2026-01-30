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
    <div className={`bg-gray-100 dark:bg-gray-700 rounded-lg p-2.5 group relative ${className}`}>
      <div
        className={`flex ${isMultiLine ? "items-start" : "items-center"} justify-between gap-3`}
      >
        <div className="flex-1 overflow-x-auto">
          {isMultiLine ? (
            commands.map((cmd, i) => (
              <div
                key={`cmd-${i}-${cmd.slice(0, 20)}`}
                className="whitespace-nowrap text-gray-800 dark:text-gray-200 text-xs font-mono"
              >
                {cmd}
              </div>
            ))
          ) : (
            <code className="whitespace-nowrap text-gray-800 dark:text-gray-200 text-xs font-mono">
              {commands[0]}
            </code>
          )}
        </div>
        <button
          onClick={() => copy(textToCopy)}
          className="flex-shrink-0 p-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
          {copied ? (
            <Check size={12} className="text-green-600" aria-hidden="true" />
          ) : (
            <Copy size={12} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
          )}
        </button>
      </div>
      {copied && (
        <div className="absolute -top-8 right-0 px-2 py-1 text-xs bg-green-600 text-white rounded shadow-md">
          Copied!
        </div>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Command copied to clipboard" : ""}
      </span>
    </div>
  );
}