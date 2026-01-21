"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExpandableSectionProps {
  name: string;
  description: string;
  content: string;
}

export function ExpandableSection({ name, description, content }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = content && content.trim().length > 0;

  return (
    <div className="border border-[var(--border)] rounded-lg">
      <button
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        className={`w-full p-3 text-left flex items-start gap-3 ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        disabled={!hasContent}
        aria-expanded={isExpanded}
      >
        {hasContent && (
          <span className="flex-shrink-0 mt-0.5 text-[var(--foreground-muted)]">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
        )}
        <div className={`flex-1 ${!hasContent ? "ml-7" : ""}`}>
          <code className="font-mono text-sm font-semibold text-[var(--accent)]">
            {name}
          </code>
          <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
            {description || "No description"}
          </p>
        </div>
      </button>
      {isExpanded && hasContent && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 p-3 bg-[var(--background-secondary)] rounded-lg overflow-x-auto">
            <pre className="text-xs text-[var(--foreground-secondary)] whitespace-pre-wrap font-mono">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
