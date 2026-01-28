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
    <div>
      {label && (
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 pt-2">{label}</div>
      )}
      <div className="bg-gray-800 rounded-md overflow-hidden">
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
          <code className="text-green-400 text-xs font-mono break-all">
            <span className="text-gray-500">$</span> {command}
          </code>
          <button
            onClick={() => copy(command)}
            className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0 cursor-pointer"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={12} className="text-green-400" />
            ) : (
              <Copy size={12} className="text-gray-400 hover:text-gray-200" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
