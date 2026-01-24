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
        <div className="text-xs text-gray-500 mb-1.5">{label}</div>
      )}
      <div className="bg-gray-100 rounded-lg p-2.5">
        <div className="flex items-center justify-between gap-2">
          <code className="text-gray-800 text-xs font-mono break-all">
            {command}
          </code>
          <button
            onClick={() => copy(command)}
            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 cursor-pointer"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={12} className="text-green-600" />
            ) : (
              <Copy size={12} className="text-gray-500 hover:text-gray-700" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
