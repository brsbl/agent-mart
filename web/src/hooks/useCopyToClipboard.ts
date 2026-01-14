"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DEFAULT_COPY_FEEDBACK_DURATION } from "@/lib/constants";

// Custom hook for clipboard functionality with proper cleanup
export function useCopyToClipboard(resetDelay = DEFAULT_COPY_FEEDBACK_DURATION) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        if (!navigator.clipboard) {
          console.error("Clipboard API not supported");
          return false;
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, resetDelay);

        return true;
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        return false;
      }
    },
    [resetDelay]
  );

  return { copied, copy };
}
